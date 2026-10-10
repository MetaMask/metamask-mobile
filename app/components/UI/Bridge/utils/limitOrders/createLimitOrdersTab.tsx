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
  /**
   * Timestamp used to group this tab. Open orders use creation time; history
   * uses the close time the row already shows.
   */
  getItemDate: (order: LimitOrder) => string | undefined;
}

/** Groups open orders by when they were placed. */
export const getOpenLimitOrderDate = (order: LimitOrder) =>
  order.timingData.createdAt;

/**
 * Groups history by when the order closed. Filled, canceled, and failed rows
 * print `closedAt`. Expired orders often only have `expiresAt`.
 */
export const getHistoryLimitOrderDate = (order: LimitOrder) =>
  order.timingData.closedAt ?? order.timingData.expiresAt;

export function createLimitOrdersTab({
  orders,
  isLoading,
  isError,
  isFetchingNextPage,
  onRetry,
  getItemDate,
}: CreateLimitOrdersTabOptions): OrdersTabConfig<LimitOrder> {
  return {
    items: orders,
    renderItem: (order) => <LimitOrderTabRow order={order} />,
    keyExtractor: (order) => order.id,
    getItemDate,
    isLoading,
    isError,
    isFetchingNextPage,
    onRetry,
  };
}
