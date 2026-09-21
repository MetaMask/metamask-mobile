import React, { useState, useCallback, useMemo } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';
import {
  TabsBar,
  type TabItem,
} from '../../../../../component-library/components-temp/Tabs';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import type { OrderItem } from '../../../../../util/orders/types';
import { useOrdersStore } from '../../../../../util/orders/ordersStore';
import { OrderListItemRow } from '../../../Orders/OrderListItemRow/OrderListItemRow';

export interface BridgeOrdersTabBarProps {
  testID?: string;
}

const noop = () => undefined;

export const BridgeOrdersTabBar: React.FC<BridgeOrdersTabBarProps> = ({
  testID = 'bridge-orders-tab-bar',
}) => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const { orders } = useOrdersStore();
  const [selectedStatus, setSelectedStatus] = useState<'open' | 'closed'>(
    'open',
  );

  const openOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.status === 'open' || order.status === 'partiallyFilled',
      ),
    [orders],
  );

  const closedOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.status === 'filled' ||
          order.status === 'cancelled' ||
          order.status === 'rejected' ||
          order.status === 'expired',
      ),
    [orders],
  );

  const tabs = useMemo<TabItem[]>(
    () => [
      {
        key: 'orders',
        label: 'Orders',
        content: null,
        testID: 'bridge-orders-tab',
      },
    ],
    [],
  );

  const handleOrderPress = useCallback(
    (order: OrderItem) => {
      navigation.navigate(Routes.ORDER_DETAILS_VIEW, {
        orderId: order.id,
        order,
      });
    },
    [navigation],
  );

  const currentOrders = selectedStatus === 'open' ? openOrders : closedOrders;
  const emptyMessage =
    selectedStatus === 'open'
      ? 'No open orders found.'
      : 'No closed orders found.';

  return (
    <View style={tw.style('w-full mt-4')} testID={testID}>
      {/* Single Orders tab bar header */}
      <TabsBar
        tabs={tabs}
        activeIndex={0}
        onTabPress={noop}
        testID="bridge-orders-tabs"
      />

      <Box paddingHorizontal={4} paddingTop={3} gap={2}>
        {/* Tiny filter pill group with Open / Closed selected state */}
        <View style={tw.style('flex-row items-center gap-2 mb-1')}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setSelectedStatus('open')}
            testID="bridge-orders-filter-open"
            style={tw.style(
              `px-3 py-1 rounded-full border ${
                selectedStatus === 'open'
                  ? 'bg-primary-muted border-primary-default'
                  : 'bg-default border-muted'
              }`,
            )}
          >
            <Text
              variant={TextVariant.BodyXs}
              fontWeight={FontWeight.Bold}
              color={
                selectedStatus === 'open'
                  ? TextColor.PrimaryDefault
                  : TextColor.TextAlternative
              }
            >
              Open ({openOrders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setSelectedStatus('closed')}
            testID="bridge-orders-filter-closed"
            style={tw.style(
              `px-3 py-1 rounded-full border ${
                selectedStatus === 'closed'
                  ? 'bg-primary-muted border-primary-default'
                  : 'bg-default border-muted'
              }`,
            )}
          >
            <Text
              variant={TextVariant.BodyXs}
              fontWeight={FontWeight.Bold}
              color={
                selectedStatus === 'closed'
                  ? TextColor.PrimaryDefault
                  : TextColor.TextAlternative
              }
            >
              Closed ({closedOrders.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Orders list items or empty state */}
        {currentOrders.length === 0 ? (
          <Box twClassName="py-8 items-center justify-center">
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              testID="bridge-orders-empty-state"
            >
              {emptyMessage}
            </Text>
          </Box>
        ) : (
          currentOrders.map((order) => (
            <OrderListItemRow
              key={order.id}
              order={order}
              onPress={handleOrderPress}
            />
          ))
        )}
      </Box>
    </View>
  );
};

export default BridgeOrdersTabBar;
