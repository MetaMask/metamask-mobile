import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Order } from '@consensys/on-ramp-sdk';
import { OrderOrderTypeEnum } from '@consensys/on-ramp-sdk/dist/API';
import { ScrollView } from 'react-native-gesture-handler';
import useAnalytics from '../hooks/useAnalytics';
import useThunkDispatch from '../../../../hooks/useThunkDispatch';
import ScreenLayout from '../components/ScreenLayout';
import OrderDetail from '../components/OrderDetails';
import Row from '../components/Row';
import StyledButton from '../../../StyledButton';
import {
  getOrderById,
  updateFiatOrder,
} from '../../../../../reducers/fiatOrders';
import { strings } from '../../../../../../locales/i18n';
import { getFiatOnRampAggNavbar } from '../../../Navbar';
import Routes from '../../../../../constants/navigation/Routes';
import { processFiatOrder } from '../..';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../util/navigation/navUtils';
import { useTheme } from '../../../../../util/theme';
import Logger from '../../../../../util/Logger';
import {
  selectNetworkConfigurations,
  selectProviderConfig,
} from '../../../../../selectors/networkController';
import { RootState } from '../../../../../reducers';

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
        },
        colors,
      ),
    );
  }, [colors, navigation]);

  useEffect(() => {
    if (order) {
      const { data, state, cryptocurrency, orderType, currency, network } =
        order;

      const {
        paymentMethod: { id: paymentMethodId },
        provider: { name: providerName },
      } = data as Order;

      const payload = {
        purchase_status: state,
        payment_method_id: paymentMethodId,
        order_type: orderType,
      };
      if (order.orderType === OrderOrderTypeEnum.Buy) {
        trackEvent('ONRAMP_PURCHASE_DETAILS_VIEWED', {
          ...payload,
          currency_destination: cryptocurrency,
          currency_source: currency,
          provider_onramp: providerName,
          chain_id_destination: network,
        });
      } else {
        trackEvent('OFFRAMP_PURCHASE_DETAILS_VIEWED', {
          ...payload,
          currency_source: cryptocurrency,
          currency_destination: currency,
          provider_offramp: providerName,
          chain_id_source: network,
        });
      }
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
      setIsRefreshing(true);
      await processFiatOrder(order, dispatchUpdateFiatOrder, dispatchThunk, {
        forced: true,
      });
    } catch (error) {
      Logger.error(error as Error, {
        message: 'FiatOrders::OrderDetails error while processing order',
        order,
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [dispatchThunk, dispatchUpdateFiatOrder, order]);

  const handleMakeAnotherPurchase = useCallback(() => {
    navigation.goBack();
    navigation.navigate(Routes.RAMP.BUY);
  }, [navigation]);

  if (!order) {
    return <ScreenLayout />;
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
            {order.orderType === OrderOrderTypeEnum.Sell ? (
              <Row>
                <StyledButton
                  type="normal"
                  onPress={() => {
                    navigation.navigate(Routes.RAMP.SEND_TRANSACTION, {
                      orderId: order.id,
                    });
                  }}
                >
                  [placeholder] Send Transaction
                </StyledButton>
              </Row>
            ) : null}
            <StyledButton type="confirm" onPress={handleMakeAnotherPurchase}>
              {strings(
                'fiat_on_ramp_aggregator.order_details.another_purchase',
              )}
            </StyledButton>
          </ScreenLayout.Content>
        </ScreenLayout.Footer>
      </ScrollView>
    </ScreenLayout>
  );
};

export default OrderDetails;
