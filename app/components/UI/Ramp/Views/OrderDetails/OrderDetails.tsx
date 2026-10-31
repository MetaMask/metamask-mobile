import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { ScrollView } from 'react-native-gesture-handler';
import {
  Box,
  Text,
  TextVariant,
  Icon,
  IconName,
  IconSize,
  FontWeight,
  Button,
  ButtonVariant,
  ButtonSize,
  HeaderStandard,
} from '@metamask/design-system-react-native';
import {
  getInternalOrderCode,
  RampsOrderStatus,
} from '@metamask/ramps-controller';
import { isBailedOrderStatus } from '../BuildQuote/BuildQuote';
import {
  getNavigateAfterExternalBrowserRoutes,
  type RampsOrderDetailsParams,
} from '../../utils/rampsNavigation';
import ScreenLayout from '../../Aggregator/components/ScreenLayout';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import {
  createNavigationDetails,
  useParams,
  resetWithRoutes,
} from '../../../../../util/navigation/navUtils';
import { useTheme } from '../../../../../util/theme';
import Logger from '../../../../../util/Logger';
import OrderContent from './OrderContent';
import {
  emitOrderConfirmedAnalyticsFromCallback,
  emitTerminalOrderAnalyticsFromCallback,
  isTerminalOrderStatus,
} from '../../../../../core/Engine/controllers/ramps-controller/event-handlers/analytics';
import { useRampsOrders } from '../../hooks/useRampsOrders';
import { showV2OrderToast } from '../../utils/v2OrderToast';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { RampsOrderDetailsSelectorsIDs } from './OrderDetails.testIds';
import { endRampsBuyCufTrace } from '../../utils/rampsBuyCufTrace';
import {
  RAMPS_BUY_CUF_BOUNDARY,
  RAMPS_BUY_CUF_END_REASON,
  RAMPS_BUY_CUF_TAG,
} from '../../constants/rampsBuyCufTags';
import { useRampScreenPerformance } from '../../hooks/useRampScreenPerformance';
import {
  RAMP_SCREEN_CONTENT_STATE,
  RAMP_V2_SCREEN_ID,
} from '../../constants/rampScreenPerformance';

export const createRampsOrderDetailsNavDetails =
  createNavigationDetails<RampsOrderDetailsParams>(
    Routes.RAMP.RAMPS_ORDER_DETAILS,
  );

const PENDING_STATUSES = new Set([
  RampsOrderStatus.Pending,
  RampsOrderStatus.Created,
  RampsOrderStatus.Precreated,
  RampsOrderStatus.Unknown,
]);

/**
 * V2 order detail screen. Reads RampsOrder from controller state only.
 * Legacy orders (DEPOSIT, RAMPS_V2 in Redux) are routed to the aggregator
 * detail screen by OrdersList — they never reach this component.
 */
const styles = StyleSheet.create({
  scrollContentContainer: {
    flexGrow: 1,
  },
  contentContainer: {
    flex: 1,
  },
});

const OrderDetails = () => {
  const params = useParams<RampsOrderDetailsParams>();
  const { getOrderById, refreshOrder, getOrderFromCallback, addOrder } =
    useRampsOrders();
  const orderCode = params.orderId ? getInternalOrderCode(params.orderId) : '';
  const order = getOrderById(orderCode);
  const isPending = order ? PENDING_STATUSES.has(order.status) : false;
  const hasCallbackParams = Boolean(
    params.callbackUrl && params.providerCode && params.walletAddress,
  );
  const shouldLoadMissingOrder = Boolean(
    params.orderId && !order && !hasCallbackParams,
  );

  const [isLoading, setIsLoading] = useState(
    isPending || hasCallbackParams || shouldLoadMissingOrder,
  );
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();
  const { colors } = theme;
  const navigation = useNavigation<AppNavigationProp>();
  const { trackEvent, createEventBuilder } = useAnalytics();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasFetchedFromCallback = useRef(false);

  useRampScreenPerformance({
    screenId: RAMP_V2_SCREEN_ID.ORDER_DETAILS,
    contentReady: !isLoading && Boolean(order || error),
    contentState: error
      ? RAMP_SCREEN_CONTENT_STATE.ERROR
      : RAMP_SCREEN_CONTENT_STATE.POPULATED,
  });

  const executeCallbackFetch = useCallback(
    async (
      providerCode: string,
      callbackUrl: string,
      walletAddress: string,
      logContext: string,
    ) => {
      try {
        setError(null);
        const fetchedOrder = await getOrderFromCallback(
          providerCode,
          callbackUrl,
          walletAddress,
        );
        if (!fetchedOrder || isBailedOrderStatus(fetchedOrder.status)) {
          endRampsBuyCufTrace({
            data: {
              [RAMPS_BUY_CUF_TAG.SUCCESS]: false,
              [RAMPS_BUY_CUF_TAG.REASON]: RAMPS_BUY_CUF_END_REASON.BAILED,
            },
          });
          resetWithRoutes(navigation, {
            index: 0,
            routes: getNavigateAfterExternalBrowserRoutes({
              returnDestination: 'buildQuote',
            }),
          });
          return;
        }
        addOrder(fetchedOrder);

        // TRAM-3738: non-terminal callback orders emit Confirmed (payment
        // submitted). Terminal orders skip Confirmed and emit Completed/Failed
        // directly — see TRAM-3691.
        if (isTerminalOrderStatus(fetchedOrder.status)) {
          emitTerminalOrderAnalyticsFromCallback(fetchedOrder);
        } else {
          emitOrderConfirmedAnalyticsFromCallback(fetchedOrder, {
            rampType: 'UNIFIED_BUY_2',
          });
        }

        // addOrder stores the order under the internal code from `id`
        // (`/orders/<code>`), not the provider's native providerOrderId.
        const internalOrderCode = getInternalOrderCode(fetchedOrder);
        showV2OrderToast({
          orderId: internalOrderCode,
          cryptocurrency:
            fetchedOrder.cryptoCurrency?.symbol ?? params.cryptocurrency ?? '',
          cryptoAmount: fetchedOrder.cryptoAmount,
          status: fetchedOrder.status,
        });
        navigation.setParams({
          orderId: internalOrderCode,
          callbackUrl: undefined,
          providerCode: undefined,
          walletAddress: undefined,
        });
      } catch (fetchError) {
        const normalizedError =
          fetchError instanceof Error
            ? fetchError
            : new Error(String(fetchError));
        Logger.error(normalizedError, {
          message: `RampsOrderDetails: error fetching order from callback URL${logContext}`,
          callbackUrl,
        });
        setError(
          fetchError instanceof Error && fetchError.message
            ? fetchError.message
            : strings('ramps_order_details.error_message'),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [getOrderFromCallback, addOrder, navigation, params.cryptocurrency],
  );

  const handleHeaderBack = useCallback(() => {
    navigation.goBack();
    trackEvent(
      createEventBuilder(MetaMetricsEvents.RAMPS_BACK_BUTTON_CLICKED)
        .addProperties({
          location: 'Order Details',
          ramp_type: 'UNIFIED_BUY_2',
        })
        .build(),
    );
  }, [navigation, trackEvent, createEventBuilder]);

  const handleRetryCallbackFetch = useCallback(async () => {
    if (!params.callbackUrl || !params.providerCode || !params.walletAddress) {
      return;
    }
    setIsLoading(true);
    await executeCallbackFetch(
      params.providerCode,
      params.callbackUrl,
      params.walletAddress,
      ' (retry)',
    );
  }, [
    params.callbackUrl,
    params.providerCode,
    params.walletAddress,
    executeCallbackFetch,
  ]);

  const hasTrackedScreenView = useRef(false);
  const hasEndedBuyCuf = useRef(false);
  useEffect(() => {
    if (order && !hasTrackedScreenView.current) {
      hasTrackedScreenView.current = true;
      trackEvent(
        createEventBuilder(MetaMetricsEvents.RAMPS_SCREEN_VIEWED)
          .addProperties({
            location: 'Order Details',
            ramp_type: 'UNIFIED_BUY_2',
          })
          .build(),
      );
    }
  }, [order, createEventBuilder, trackEvent]);

  useEffect(() => {
    if (!order || hasEndedBuyCuf.current) {
      return;
    }
    hasEndedBuyCuf.current = true;
    endRampsBuyCufTrace({
      data: {
        [RAMPS_BUY_CUF_TAG.SUCCESS]: true,
        [RAMPS_BUY_CUF_TAG.BOUNDARY]: RAMPS_BUY_CUF_BOUNDARY.ORDER_DETAILS,
        orderId: order.providerOrderId,
      },
    });
  }, [order]);

  const fetchMissingOrder = useCallback(async () => {
    const orderId = params.orderId;
    if (!orderId || !params.providerCode || !params.walletAddress) {
      setError(strings('ramps_order_details.error_message'));
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      setIsLoading(true);
      await refreshOrder(
        params.providerCode,
        getInternalOrderCode(orderId),
        params.walletAddress,
      );
    } catch (fetchError) {
      const normalizedError =
        fetchError instanceof Error
          ? fetchError
          : new Error(String(fetchError));
      Logger.error(normalizedError, {
        message: 'RampsOrderDetails: error fetching order missing from state',
        orderId,
        provider: params.providerCode,
      });
      setError(
        fetchError instanceof Error && fetchError.message
          ? fetchError.message
          : strings('ramps_order_details.error_message'),
      );
    } finally {
      setIsLoading(false);
    }
  }, [params.orderId, params.providerCode, params.walletAddress, refreshOrder]);

  const missingOrderFetchKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!shouldLoadMissingOrder || !params.orderId) {
      return;
    }
    const fetchKey = `${params.orderId}|${params.providerCode ?? ''}|${params.walletAddress ?? ''}`;
    if (missingOrderFetchKeyRef.current === fetchKey) {
      return;
    }
    missingOrderFetchKeyRef.current = fetchKey;
    fetchMissingOrder();
  }, [
    shouldLoadMissingOrder,
    params.orderId,
    params.providerCode,
    params.walletAddress,
    fetchMissingOrder,
  ]);

  const handleOnRefresh = useCallback(async () => {
    if (!order) return;
    try {
      setError(null);
      setIsRefreshing(true);
      const providerCode = order.provider?.id ?? '';
      await refreshOrder(
        providerCode,
        order.providerOrderId,
        order.walletAddress,
      );
    } catch (fetchError) {
      Logger.error(fetchError as Error, {
        message: 'FiatOrders::RampsOrderDetails error while refreshing order',
        orderId: order.providerOrderId,
        provider: order.provider?.id,
        status: order.status,
      });
      setError(
        fetchError instanceof Error && fetchError.message
          ? fetchError.message
          : strings('ramps_order_details.error_message'),
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [order, refreshOrder]);

  const handleRetry = useCallback(() => {
    if (hasCallbackParams) {
      handleRetryCallbackFetch();
      return;
    }
    if (!order && params.orderId) {
      fetchMissingOrder();
      return;
    }
    handleOnRefresh();
  }, [
    hasCallbackParams,
    handleRetryCallbackFetch,
    order,
    params.orderId,
    fetchMissingOrder,
    handleOnRefresh,
  ]);

  // Preserve prior mount-only semantics: evaluate once on first effect run.
  // Marking the ref before the condition matters — callback success clears
  // callback params via setParams while the order may still be pending; if we
  // only marked the ref when refreshing, that transition would spuriously
  // call handleOnRefresh.
  const hasAttemptedInitialPendingRefreshRef = useRef(false);

  useEffect(() => {
    if (hasAttemptedInitialPendingRefreshRef.current) {
      return;
    }
    hasAttemptedInitialPendingRefreshRef.current = true;
    if (isPending && !hasCallbackParams) {
      handleOnRefresh();
    }
  }, [isPending, hasCallbackParams, handleOnRefresh]);

  useEffect(() => {
    if (
      !hasCallbackParams ||
      hasFetchedFromCallback.current ||
      !params.callbackUrl ||
      !params.providerCode ||
      !params.walletAddress
    ) {
      return;
    }
    hasFetchedFromCallback.current = true;

    executeCallbackFetch(
      params.providerCode,
      params.callbackUrl,
      params.walletAddress,
      '',
    );
  }, [
    hasCallbackParams,
    params.callbackUrl,
    params.providerCode,
    params.walletAddress,
    executeCallbackFetch,
  ]);

  if (isLoading) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <HeaderStandard
            title={strings('ramps_order_details.title')}
            onBack={handleHeaderBack}
            backButtonProps={{
              testID: 'ramps-order-details-back-navbar-button',
            }}
            includesTopInset
          />
          <ScreenLayout.Content>
            <ActivityIndicator />
          </ScreenLayout.Content>
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }

  if (error || !order) {
    const displayedError =
      error ?? strings('ramps_order_details.error_message');
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <HeaderStandard
            title={strings('ramps_order_details.title')}
            onBack={handleHeaderBack}
            backButtonProps={{
              testID: 'ramps-order-details-back-navbar-button',
            }}
            includesTopInset
          />
          <Box twClassName="flex-1 items-center justify-center px-16 py-16">
            <Icon
              name={IconName.Danger}
              size={IconSize.Xl}
              twClassName="text-error-default mb-2"
            />
            <Text
              variant={TextVariant.HeadingSm}
              fontWeight={FontWeight.Bold}
              twClassName="text-center mb-2"
            >
              {strings('ramps_order_details.error_title')}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              twClassName="text-alternative text-center mb-8"
            >
              {displayedError}
            </Text>
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={handleRetry}
            >
              {strings('ramps_order_details.try_again')}
            </Button>
          </Box>
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout testID={RampsOrderDetailsSelectorsIDs.CONTAINER}>
      <ScreenLayout.Body>
        <HeaderStandard
          title={strings('ramps_order_details.title')}
          onBack={handleHeaderBack}
          backButtonProps={{
            testID: 'ramps-order-details-back-navbar-button',
          }}
          includesTopInset
        />
        <ScrollView
          contentContainerStyle={styles.scrollContentContainer}
          refreshControl={
            <RefreshControl
              colors={[colors.primary.default]}
              tintColor={colors.icon.default}
              refreshing={isRefreshing}
              onRefresh={handleOnRefresh}
            />
          }
        >
          <ScreenLayout.Content style={styles.contentContainer}>
            <OrderContent
              order={order}
              showCloseButton={params.showCloseButton}
            />
          </ScreenLayout.Content>
        </ScrollView>
      </ScreenLayout.Body>
    </ScreenLayout>
  );
};

export default OrderDetails;
