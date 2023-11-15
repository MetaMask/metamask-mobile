import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Order } from '@consensys/on-ramp-sdk';
import { OrderOrderTypeEnum } from '@consensys/on-ramp-sdk/dist/API';
import { ScrollView } from 'react-native-gesture-handler';
import useAnalytics from '../../hooks/useAnalytics';
import useThunkDispatch from '../../../../../hooks/useThunkDispatch';
import ScreenLayout from '../../components/ScreenLayout';
import OrderDetail from '../../components/OrderDetails';
import Row from '../../components/Row';
import StyledButton from '../../../../StyledButton';
import {
  getOrderById,
  updateFiatOrder,
} from '../../../../../../reducers/fiatOrders';
import { strings } from '../../../../../../../locales/i18n';
import { getFiatOnRampAggNavbar } from '../../../../Navbar';
import Routes from '../../../../../../constants/navigation/Routes';
import { processFiatOrder } from '../../../index';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import { useTheme } from '../../../../../../util/theme';
import Logger from '../../../../../../util/Logger';
import {
  selectNetworkConfigurations,
  selectProviderConfig,
} from '../../../../../../selectors/networkController';
import { RootState } from '../../../../../../reducers';
import { FIAT_ORDER_STATES } from '../../../../../../constants/on-ramp';
import ErrorView from '../../components/ErrorView';

interface OrderDetailsParams {
  orderId?: string;
}

export const createOrderDetailsNavDetails =
  createNavigationDetails<OrderDetailsParams>(Routes.RAMP.ORDER_DETAILS);

const OrderDetails = () => {
  const trackEvent = useAnalytics();
  const providerConfig = useSelector(selectProviderConfig);
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const params = useParams<OrderDetailsParams>();
  const order = useSelector((state: RootState) =>
    getOrderById(state, params.orderId),
  );
  const [isLoading, setIsLoading] = useState(
    order?.state === FIAT_ORDER_STATES.CREATED,
  );
  const [error, setError] = useState<string | null>(null);
  const { colors } = useTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const dispatchThunk = useThunkDispatch();

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    navigation.setOptions(
      getFiatOnRampAggNavbar(
        navigation,
        {
          title: strings('fiat_on_ramp_aggregator.order_details.details_main'),
          showCancel: false,
        },
        colors,
      ),
    );
  }, [colors, navigation]);

  useEffect(() => {
    if (order) {
      trackEvent('ONRAMP_PURCHASE_DETAILS_VIEWED', {
        purchase_status: order.state,
        provider_onramp: (order.data as Order)?.provider.name,
        payment_method_id: (order.data as Order)?.paymentMethod?.id,
        currency_destination: order.cryptocurrency,
        currency_source: order.currency,
        chain_id_destination: order.network,
        order_type: order.orderType,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackEvent]);

  const dispatchUpdateFiatOrder = useCallback(
    (updatedOrder) => {
      dispatch(updateFiatOrder(updatedOrder));
    },
    [dispatch],
  );

  const handleOnRefresh = useCallback(async () => {
    if (!order) return;
    try {
      setError(null);
      setIsRefreshing(true);
      await processFiatOrder(order, dispatchUpdateFiatOrder, dispatchThunk, {
        forced: true,
      });
    } catch (fetchError) {
      Logger.error(fetchError as Error, {
        message: 'FiatOrders::OrderDetails error while processing order',
        order,
      });
      setError((fetchError as Error).message || 'An error as occurred');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [dispatchThunk, dispatchUpdateFiatOrder, order]);

  useEffect(() => {
    if (order?.state === FIAT_ORDER_STATES.CREATED) {
      handleOnRefresh();
    }
    // only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMakeAnotherPurchase = useCallback(() => {
    navigation.goBack();
    navigation.navigate(
      order?.orderType === OrderOrderTypeEnum.Buy
        ? Routes.RAMP.BUY
        : Routes.RAMP.SELL,
    );
  }, [navigation, order?.orderType]);

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
          <ErrorView
            description={error}
            ctaOnPress={handleOnRefresh}
            location="Order Details Screen"
          />
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
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
            <OrderDetail
              order={order}
              providerConfig={providerConfig}
              networkConfigurations={networkConfigurations}
            />
          </ScreenLayout.Content>
        </ScreenLayout.Body>
        <ScreenLayout.Footer>
          <ScreenLayout.Content>
            {order.orderType === OrderOrderTypeEnum.Sell &&
            !order.sellTxHash &&
            order.state === FIAT_ORDER_STATES.CREATED ? (
              <Row>
                <StyledButton
                  type="confirm"
                  onPress={() => {
                    navigation.navigate(Routes.RAMP.SEND_TRANSACTION, {
                      orderId: order.id,
                    });
                  }}
                >
                  {strings(
                    'fiat_on_ramp_aggregator.order_details.continue_order',
                  )}
                </StyledButton>
              </Row>
            ) : null}

            {order.state !== FIAT_ORDER_STATES.CREATED &&
              order.state !== FIAT_ORDER_STATES.PENDING && (
                <StyledButton
                  type="confirm"
                  onPress={handleMakeAnotherPurchase}
                >
                  {strings(
                    'fiat_on_ramp_aggregator.order_details.start_new_order',
                  )}
                </StyledButton>
              )}
          </ScreenLayout.Content>
        </ScreenLayout.Footer>
      </ScrollView>
    </ScreenLayout>
  );
};

export default OrderDetails;
