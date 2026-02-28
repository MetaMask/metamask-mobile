import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
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
} from '@metamask/design-system-react-native';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import useThunkDispatch from '../../../../hooks/useThunkDispatch';
import ScreenLayout from '../../Aggregator/components/ScreenLayout';
import {
  FiatOrder,
  getOrderById,
  updateFiatOrder,
} from '../../../../../reducers/fiatOrders';
import { strings } from '../../../../../../locales/i18n';
import { getRampsOrderDetailsNavbarOptions } from '../../../Navbar';
import Routes from '../../../../../constants/navigation/Routes';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../util/navigation/navUtils';
import { useTheme } from '../../../../../util/theme';
import Logger from '../../../../../util/Logger';
import { RootState } from '../../../../../reducers';
import { FIAT_ORDER_STATES } from '../../../../../constants/on-ramp';
import useInterval from '../../../../hooks/useInterval';
import AppConstants from '../../../../../core/AppConstants';
import OrderContent from './OrderContent';
import { RampsOrderDetailsSelectorsIDs } from './OrderDetails.testIds';
import { processFiatOrder } from '../../index';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';

interface RampsOrderDetailsParams {
  orderId: string;
  showCloseButton?: boolean;
}

export const createRampsOrderDetailsNavDetails =
  createNavigationDetails<RampsOrderDetailsParams>(
    Routes.RAMP.RAMPS_ORDER_DETAILS,
  );

const OrderDetails = () => {
  const params = useParams<RampsOrderDetailsParams>();
  const order = useSelector((state: RootState) =>
    getOrderById(state, params.orderId),
  );
  const [isLoading, setIsLoading] = useState(
    order?.state === FIAT_ORDER_STATES.PENDING ||
      order?.state === FIAT_ORDER_STATES.CREATED,
  );
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();
  const { colors } = theme;
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const dispatch = useDispatch();
  const dispatchThunk = useThunkDispatch();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRefreshingInterval, setIsRefreshingInterval] = useState(false);

  useEffect(() => {
    navigation.setOptions(
      getRampsOrderDetailsNavbarOptions(
        navigation,
        { title: strings('ramps_order_details.title') },
        theme,
        () => {
          trackEvent(
            createEventBuilder(MetaMetricsEvents.RAMPS_BACK_BUTTON_CLICKED)
              .addProperties({
                location: 'Order Details',
                ramp_type: 'UNIFIED_BUY_2',
              })
              .build(),
          );
        },
      ),
    );
  }, [theme, navigation, createEventBuilder, trackEvent]);

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

  const dispatchUpdateFiatOrder = useCallback(
    (updatedOrder: FiatOrder) => dispatch(updateFiatOrder(updatedOrder)),
    [dispatch],
  );

  const handleOnRefresh = useCallback(
    async ({ fromInterval }: { fromInterval?: boolean } = {}) => {
      if (!order) return;
      try {
        setError(null);
        if (fromInterval) {
          setIsRefreshingInterval(true);
        } else {
          setIsRefreshing(true);
        }
        await processFiatOrder(order, dispatchUpdateFiatOrder, dispatchThunk, {
          forced: true,
        });
      } catch (fetchError) {
        Logger.error(fetchError as Error, {
          message: 'FiatOrders::RampsOrderDetails error while processing order',
          order,
        });
        setError(
          fetchError instanceof Error && fetchError.message
            ? fetchError.message
            : strings('ramps_order_details.error_message'),
        );
      } finally {
        if (fromInterval) {
          setIsRefreshingInterval(false);
        } else {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [dispatchThunk, dispatchUpdateFiatOrder, order],
  );

  useEffect(() => {
    if (
      order?.state === FIAT_ORDER_STATES.PENDING ||
      order?.state === FIAT_ORDER_STATES.CREATED
    ) {
      handleOnRefresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useInterval(() => handleOnRefresh({ fromInterval: true }), {
    delay:
      !isLoading &&
      !isRefreshingInterval &&
      order &&
      (order.state === FIAT_ORDER_STATES.PENDING ||
        order.state === FIAT_ORDER_STATES.CREATED)
        ? AppConstants.FIAT_ORDERS.POLLING_FREQUENCY
        : null,
  });

  if (!order) {
    return <ScreenLayout />;
  }

  if (isLoading) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <ScreenLayout.Content>
            <ActivityIndicator />
          </ScreenLayout.Content>
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }

  if (error) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
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
              variant={ButtonVariants.Primary}
              size={ButtonSize.Lg}
              width={ButtonWidthTypes.Full}
              label={strings('ramps_order_details.try_again')}
              onPress={handleOnRefresh}
            />
          </Box>
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout testID={RampsOrderDetailsSelectorsIDs.CONTAINER}>
      <ScrollView
        refreshControl={
          <RefreshControl
            colors={[colors.primary.default]}
            tintColor={colors.icon.default}
            refreshing={isRefreshing}
            onRefresh={handleOnRefresh}
          />
        }
      >
        <ScreenLayout.Body>
          <ScreenLayout.Content>
            <OrderContent
              order={order}
              showCloseButton={params.showCloseButton}
            />
          </ScreenLayout.Content>
        </ScreenLayout.Body>
      </ScrollView>
    </ScreenLayout>
  );
};

export default OrderDetails;
