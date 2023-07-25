import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Order } from '@consensys/on-ramp-sdk';
import { ScrollView } from 'react-native-gesture-handler';
import useAnalytics from '../hooks/useAnalytics';
import useThunkDispatch from '../../../hooks/useThunkDispatch';
import ScreenLayout from '../components/ScreenLayout';
import OrderDetail from '../components/OrderDetails';
import StyledButton from '../../StyledButton';
import { getOrderById, updateFiatOrder } from '../../../../reducers/fiatOrders';
import { strings } from '../../../../../locales/i18n';
import { getFiatOnRampAggNavbar } from '../../Navbar';
import Routes from '../../../../constants/navigation/Routes';
import { processFiatOrder } from '..';
import {
  createNavigationDetails,
  useParams,
} from '../../../../util/navigation/navUtils';
import { useTheme } from '../../../../util/theme';
import Logger from '../../../../util/Logger';
import { selectProviderConfig } from '../../../../selectors/networkController';
import { selectFrequentRpcList } from '../../../../selectors/preferencesController';

interface OrderDetailsParams {
  orderId?: string;
}

export const createOrderDetailsNavDetails =
  createNavigationDetails<OrderDetailsParams>(
    Routes.FIAT_ON_RAMP_AGGREGATOR.ORDER_DETAILS,
  );

const OrderDetails = () => {
  const trackEvent = useAnalytics();
  const providerConfig = useSelector(selectProviderConfig);
  const frequentRpcList = useSelector(selectFrequentRpcList);
  const params = useParams<OrderDetailsParams>();
  const order = useSelector((state) => getOrderById(state, params.orderId));
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
    navigation.navigate(Routes.FIAT_ON_RAMP_AGGREGATOR.ID);
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
              frequentRpcList={frequentRpcList}
            />
          </ScreenLayout.Content>
        </ScreenLayout.Body>
        <ScreenLayout.Footer>
          <ScreenLayout.Content>
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
