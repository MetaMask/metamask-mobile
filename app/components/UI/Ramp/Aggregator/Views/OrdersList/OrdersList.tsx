import React, { useCallback, useState } from 'react';
import { FlatList, TouchableHighlight, Pressable, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { OrderOrderTypeEnum } from '@consensys/on-ramp-sdk/dist/API';

import { createOrderDetailsNavDetails } from '../OrderDetails/OrderDetails';
import { createDepositNavigationDetails } from '../../../Deposit/routes/utils';
import OrderListItem from '../../components/OrderListItem';
import createStyles from './OrdersList.styles';

import { TabEmptyState } from '../../../../../../component-library/components-temp/TabEmptyState';
import {
  Box,
  Text,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../../../constants/on-ramp';
import { FiatOrder, getOrders } from '../../../../../../reducers/fiatOrders';
import { strings } from '../../../../../../../locales/i18n';
import { useTheme } from '../../../../../../util/theme';
import { createDepositOrderDetailsNavDetails } from '../../../Deposit/Views/DepositOrderDetails/DepositOrderDetails';

type filterType = 'ALL' | 'PURCHASE' | 'SELL';

function OrdersList() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const tw = useTailwind();
  const navigation = useNavigation();
  const allOrders = useSelector(getOrders);
  const [currentFilter, setCurrentFilter] = useState<filterType>('ALL');
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
        navigation.navigate(...createDepositNavigationDetails());
      } else {
        navigation.navigate(
          ...createDepositOrderDetailsNavDetails({
            orderId,
          }),
        );
      }
    },
    [navigation, orders],
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

  const renderFilterTab = (filter: filterType, label: string) => {
    const isActive = currentFilter === filter;

    return (
      <Pressable
        key={filter}
        onPress={() => setCurrentFilter(filter)}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) =>
          tw.style(
            'h-10 px-4 rounded-xl items-center justify-center',
            isActive ? 'bg-icon-default' : 'bg-background-muted',
            pressed && 'opacity-70',
          )
        }
      >
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          twClassName={isActive ? 'text-icon-inverse' : 'text-default'}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <FlatList
      ListHeaderComponent={
        <Box twClassName="py-2 bg-default">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={tw.style('flex-row gap-3')}
          >
            {renderFilterTab('ALL', strings('fiat_on_ramp_aggregator.All'))}
            {renderFilterTab(
              'PURCHASE',
              strings('fiat_on_ramp_aggregator.Purchased'),
            )}
            {renderFilterTab('SELL', strings('fiat_on_ramp_aggregator.Sold'))}
          </ScrollView>
        </Box>
      }
      data={orders}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <TabEmptyState
            description={
              currentFilter === 'ALL'
                ? strings('fiat_on_ramp_aggregator.empty_orders_list')
                : currentFilter === 'PURCHASE'
                ? strings('fiat_on_ramp_aggregator.empty_buy_orders_list')
                : strings('fiat_on_ramp_aggregator.empty_sell_orders_list')
            }
          />
        </View>
      }
    />
  );
}

export default OrdersList;
