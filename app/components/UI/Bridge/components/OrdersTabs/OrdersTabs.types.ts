import type { ReactElement } from 'react';
import type { CaipChainId, Hex } from '@metamask/utils';

export enum OrdersTabKey {
  OpenOrders = 'openOrders',
  History = 'history',
}

export interface OrdersTabConfig<T> {
  items: T[];
  renderItem?: (item: T, index: number) => ReactElement;
  keyExtractor?: (item: T, index: number) => string;
  isLoading?: boolean;
  isError?: boolean;
  isFetchingNextPage?: boolean;
  onRetry?: () => void;
  /**
   * Chain used by the All networks filter for this tab's items.
   */
  getItemChainId?: (item: T) => Hex | CaipChainId | undefined;
  /**
   * ISO-8601 timestamp used to group this tab's items under date headers.
   * Omit to render a flat list.
   */
  getItemDate?: (item: T) => string | undefined;
}

export interface OrdersTabsProps<TOpen, THistory> {
  openOrders: OrdersTabConfig<TOpen>;
  history: OrdersTabConfig<THistory>;
  initialTab?: OrdersTabKey;
  activeTab?: OrdersTabKey;
  onTabChange?: (tab: OrdersTabKey) => void;
  /**
   * Restricts the orders network picker to these chains.
   * Omit to show the default allowed ranking.
   */
  enabledChainIds?: CaipChainId[];
}
