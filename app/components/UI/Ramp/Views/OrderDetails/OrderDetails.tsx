import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
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
} from '@metamask/design-system-react-native';
import {
  normalizeProviderCode,
  RampsOrderStatus,
} from '@metamask/ramps-controller';
import { isBailedOrderStatus } from '../BuildQuote/BuildQuote';
import { extractOrderCode } from '../../utils/extractOrderCode';
import {
  getNavigateAfterExternalBrowserRoutes,
  type RampsOrderDetailsParams,
} from '../../utils/rampsNavigation';
import ScreenLayout from '../../Aggregator/components/ScreenLayout';
import { strings } from '../../../../../../locales/i18n';
import HeaderCompactStandard from '../../../../../component-library/components-temp/HeaderCompactStandard';
import Routes from '../../../../../constants/navigation/Routes';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../util/navigation/navUtils';
import { useTheme } from '../../../../../util/theme';
import Logger from '../../../../../util/Logger';
import OrderContent from './OrderContent';
import { useRampsOrders } from '../../hooks/useRampsOrders';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { RampsOrderDetailsSelectorsIDs } from './OrderDetails.testIds';

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
  const orderCode = params.orderId ? extractOrderCode(params.orderId) : '';
  const order = getOrderById(orderCode);
  const isPending = order ? PENDING_STATUSES.has(order.status) : false;
  const hasCallbackParams = Boolean(
    params.callbackUrl && params.providerCode && params.walletAddress,
  );

  const [isLoading, setIsLoading] = useState(isPending || hasCallbackParams);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();
  const { colors } = theme;
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useAnalytics();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasFetchedFromCallback = useRef(false);

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
          navigation.reset({
            index: 0,
            routes: getNavigateAfterExternalBrowserRoutes({
              returnDestination: 'buildQuote',
            }),
          });
          return;
        }
        addOrder(fetchedOrder);
        navigation.setParams({
          orderId: fetchedOrder.providerOrderId,
          callbackUrl: undefined,
          providerCode: undefined,
          walletAddress: undefined,
        });
      } catch (fetchError) {
        Logger.error(fetchError as Error, {
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
    [getOrderFromCallback, addOrder, navigation],
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

  const handleOnRefresh = useCallback(async () => {
    if (!order) return;
    try {
      setError(null);
      setIsRefreshing(true);
      const providerCode = normalizeProviderCode(order.provider?.id ?? '');
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

  useEffect(() => {
    if (isPending && !hasCallbackParams) {
      handleOnRefresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          <HeaderCompactStandard
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

  if (error) {
    const onRetry = hasCallbackParams
      ? handleRetryCallbackFetch
      : handleOnRefresh;
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <HeaderCompactStandard
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
              {error}
            </Text>
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={onRetry}
            >
              {strings('ramps_order_details.try_again')}
            </Button>
          </Box>
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }

  if (!order) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <HeaderCompactStandard
            title={strings('ramps_order_details.title')}
            onBack={handleHeaderBack}
            backButtonProps={{
              testID: 'ramps-order-details-back-navbar-button',
            }}
            includesTopInset
          />
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout testID={RampsOrderDetailsSelectorsIDs.CONTAINER}>
      <ScreenLayout.Body>
        <HeaderCompactStandard
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
