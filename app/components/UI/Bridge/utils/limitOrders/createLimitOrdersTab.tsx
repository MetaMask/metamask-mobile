import React from 'react';
import { parseCaipAssetType, type CaipAssetType } from '@metamask/utils';
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

const getLimitOrderChainId = (order: LimitOrder) =>
  parseCaipAssetType(order.src.asset.assetId as CaipAssetType).chainId;

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
    getItemChainId: getLimitOrderChainId,
    isLoading,
    isError,
    isFetchingNextPage,
    onRetry,
  };
}
