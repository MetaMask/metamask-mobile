import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl } from 'react-native';
import ScreenLayout from '../components/ScreenLayout';
import StyledButton from '../../StyledButton';
import { useNavigation, useRoute } from '@react-navigation/native';
import OrderDetail from '../components/OrderDetails';
import { strings } from '../../../../../locales/i18n';
import {
  makeOrderIdSelector,
  updateFiatOrder,
} from '../../../../reducers/fiatOrders';
import { useDispatch, useSelector } from 'react-redux';
import { getFiatOnRampAggNavbar } from '../../Navbar';
import { useTheme } from '../../../../util/theme';
import { ScrollView } from 'react-native-gesture-handler';
import Routes from '../../../../constants/navigation/Routes';
import { FiatOrder, processFiatOrder } from '../../FiatOrders';
import useAnalytics from '../hooks/useAnalytics';
import { Order } from '@consensys/on-ramp-sdk';
import Logger from '../../../../util/Logger';

const OrderDetails = () => {
  const trackEvent = useAnalytics();
  const provider = useSelector(
    (state: any) => state.engine.backgroundState.NetworkController.provider,
  );
  const frequentRpcList = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.frequentRpcList,
  );
  const routes = useRoute();
  const order: FiatOrder = useSelector(
    // @ts-expect-error expect params error
    makeOrderIdSelector(routes?.params?.orderId),
  );
  const { colors } = useTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    navigation.setOptions(
      getFiatOnRampAggNavbar(
        navigation,
        {
          title: strings('fiat_on_ramp_aggregator.order_details.details_main'),
          showBack: false,
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
        currency_destination: order.cryptocurrency,
        currency_source: order.currency,
        chain_id_destination: order.network,
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
    try {
      setIsRefreshing(true);
      await processFiatOrder(order, dispatchUpdateFiatOrder);
    } catch (error) {
      Logger.error(error as Error, {
        message: 'FiatOrders::OrderDetails error while processing order',
        order,
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [dispatchUpdateFiatOrder, order]);

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
              provider={provider}
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
