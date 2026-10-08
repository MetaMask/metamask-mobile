import React from 'react';
import { LimitOrder } from '../../api/limitOrders/getLimitOrders/types';
import { LimitOrderTabRow } from '../../components/LimitOrderTabRow';
import { OrdersTabConfig } from '../../components/OrdersTabs';

interface CreateLimitOrdersTabOptions {
  orders: LimitOrder[];
  isLoading: boolean;
  isError: boolean;
  isFetchingNextPage: boolean;
  onRetry: () => void;
}

const getLimitOrderDate = (order: LimitOrder) => order.timingData.createdAt;

export function createLimitOrdersTab({
  orders,
  isLoading,
  isError,
  isFetchingNextPage,
  onRetry,
}: CreateLimitOrdersTabOptions): OrdersTabConfig<LimitOrder> {
  return {
    items: orders,
    renderItem: (order) => <LimitOrderTabRow order={order} />,
    keyExtractor: (order) => order.id,
    getItemDate: getLimitOrderDate,
    isLoading,
    isError,
    isFetchingNextPage,
    onRetry,
  };
}
