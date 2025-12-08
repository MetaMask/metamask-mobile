import React, { useCallback, useState } from 'react';
import { FlatList, TouchableHighlight } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { OrderOrderTypeEnum } from '@consensys/on-ramp-sdk/dist/API';

import { createOrderDetailsNavDetails } from '../OrderDetails/OrderDetails';
import { useRampNavigation } from '../../../hooks/useRampNavigation';
import OrderListItem from '../../components/OrderListItem';
import createStyles from './OrdersList.styles';
import { TabEmptyState } from '../../../../../../component-library/components-temp/TabEmptyState';

import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../../../constants/on-ramp';
import { FiatOrder, getOrders } from '../../../../../../reducers/fiatOrders';
import { strings } from '../../../../../../../locales/i18n';
import { useTheme } from '../../../../../../util/theme';
import { createDepositOrderDetailsNavDetails } from '../../../Deposit/Views/DepositOrderDetails/DepositOrderDetails';
import ButtonFilter from '../../../../../../component-library/components-temp/ButtonFilter';
import {
  Box,
  ButtonSize as ButtonBaseSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

type filterType = 'ALL' | 'PURCHASE' | 'SELL';

function OrdersList() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation();
  const allOrders = useSelector(getOrders);
  const [currentFilter, setCurrentFilter] = useState<filterType>('ALL');
  const { goToDeposit } = useRampNavigation();
  const tw = useTailwind();
  const orders = allOrders.filter((order) => {
    if (currentFilter === 'PURCHASE') {
      return (
        order.orderType === OrderOrderTypeEnum.Buy ||
        order.orderType === 'DEPOSIT'
      );
    }
    if (currentFilter === 'SELL') {
      return order.orderType === OrderOrderTypeEnum.Sell;
    }
    return true;
  });

  const handleNavigateToAggregatorTxDetails = useCallback(
    (orderId: string) => {
      navigation.navigate(
        ...createOrderDetailsNavDetails({
          orderId,
        }),
      );
    },
    [navigation],
  );

  const handleNavigateToDepositTxDetails = useCallback(
    (orderId: string) => {
      const order = orders.find((o) => o.id === orderId);

      if (order?.state === FIAT_ORDER_STATES.CREATED) {
        goToDeposit();
      } else {
        navigation.navigate(
          ...createDepositOrderDetailsNavDetails({
            orderId,
          }),
        );
      }
    },
    [navigation, orders, goToDeposit],
  );

  const renderItem = ({ item }: { item: FiatOrder }) => (
    <TouchableHighlight
      accessibilityRole="button"
      accessible
      style={styles.row}
      onPress={
        item.provider === FIAT_ORDER_PROVIDERS.AGGREGATOR
          ? () => handleNavigateToAggregatorTxDetails(item.id)
          : item.provider === FIAT_ORDER_PROVIDERS.DEPOSIT
            ? () => handleNavigateToDepositTxDetails(item.id)
            : undefined
      }
      underlayColor={colors.background.alternative}
      activeOpacity={1}
    >
      <OrderListItem order={item} />
    </TouchableHighlight>
  );

  return (
    <FlatList
      ListHeaderComponent={
        <Box twClassName="px-4 py-2 bg-default">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={tw.style('flex-row gap-3')}
          >
            <ButtonFilter
              onPress={() => setCurrentFilter('ALL')}
              isActive={currentFilter === 'ALL'}
              size={ButtonBaseSize.Md}
              accessibilityLabel={strings('fiat_on_ramp_aggregator.All')}
            >
              {strings('fiat_on_ramp_aggregator.All')}
            </ButtonFilter>
            <ButtonFilter
              onPress={() => setCurrentFilter('PURCHASE')}
              isActive={currentFilter === 'PURCHASE'}
              size={ButtonBaseSize.Md}
              accessibilityLabel={strings('fiat_on_ramp_aggregator.Purchased')}
            >
              {strings('fiat_on_ramp_aggregator.Purchased')}
            </ButtonFilter>
            <ButtonFilter
              onPress={() => setCurrentFilter('SELL')}
              isActive={currentFilter === 'SELL'}
              size={ButtonBaseSize.Md}
              accessibilityLabel={strings('fiat_on_ramp_aggregator.Sold')}
            >
              {strings('fiat_on_ramp_aggregator.Sold')}
            </ButtonFilter>
          </ScrollView>
        </Box>
      }
      data={orders}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        <Box twClassName="w-full items-center py-10">
          <TabEmptyState
            description={
              currentFilter === 'ALL'
                ? strings('fiat_on_ramp_aggregator.empty_orders_list')
                : currentFilter === 'PURCHASE'
                  ? strings('fiat_on_ramp_aggregator.empty_buy_orders_list')
                  : strings('fiat_on_ramp_aggregator.empty_sell_orders_list')
            }
          />
        </Box>
      }
    />
  );
}

export default OrdersList;
