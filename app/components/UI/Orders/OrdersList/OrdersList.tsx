import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import {
  Text,
  TextVariant,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { OrderItem, OrderDomain } from '../../../../util/orders/types';
import { OrderListItemRow } from '../OrderListItemRow/OrderListItemRow';

interface OrdersListProps {
  orders: OrderItem[];
  onSelectOrder?: (order: OrderItem) => void;
  showFilters?: boolean;
  emptyMessage?: string;
  testID?: string;
}

const DOMAIN_FILTERS: { key: 'all' | OrderDomain; label: string }[] = [
  { key: 'all', label: 'All Orders' },
  { key: 'swap', label: 'Swaps' },
  { key: 'perps', label: 'Perps' },
  { key: 'predict', label: 'Predict' },
];

export const OrdersList: React.FC<OrdersListProps> = ({
  orders,
  onSelectOrder,
  showFilters = true,
  emptyMessage = 'No active orders found.',
  testID,
}) => {
  const tw = useTailwind();
  const [activeFilter, setActiveFilter] = useState<'all' | OrderDomain>('all');

  const filteredOrders = orders.filter((order) => {
    if (activeFilter === 'all') return true;
    return order.domain === activeFilter;
  });

  return (
    <View style={tw.style('w-full flex-1')} testID={testID ?? 'orders-list'}>
      {/* Domain Filters */}
      {showFilters && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={tw.style('flex-row gap-2 py-2 mb-2')}
        >
          {DOMAIN_FILTERS.map((filter) => {
            const isActive = activeFilter === filter.key;
            return (
              <TouchableOpacity
                key={filter.key}
                onPress={() => setActiveFilter(filter.key)}
                style={tw.style(
                  `px-3 py-1.5 rounded-full border ${
                    isActive
                      ? 'bg-default border-primary'
                      : 'bg-muted border-muted'
                  }`,
                )}
              >
                <Text
                  variant={TextVariant.BodySmMedium}
                  fontWeight={isActive ? FontWeight.Bold : FontWeight.Regular}
                  color={
                    isActive
                      ? TextColor.PrimaryDefault
                      : TextColor.TextAlternative
                  }
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Orders List / Empty State */}
      {filteredOrders.length === 0 ? (
        <View style={tw.style('py-8 items-center justify-center')}>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {emptyMessage}
          </Text>
        </View>
      ) : (
        <View style={tw.style('gap-1')}>
          {filteredOrders.map((order) => (
            <OrderListItemRow
              key={order.id}
              order={order}
              onPress={onSelectOrder}
            />
          ))}
        </View>
      )}
    </View>
  );
};
