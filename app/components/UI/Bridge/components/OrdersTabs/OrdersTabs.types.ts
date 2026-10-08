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
   * Chain used by the All networks filter for this tab's items. The filter
   * is only shown once the items span at least two of these chains, or
   * while a network is selected. Omit to hide the filter for this tab.
   */
  getItemChainId?: (item: T) => Hex | CaipChainId | undefined;
}

export interface OrdersTabsProps<TOpen, THistory> {
  openOrders: OrdersTabConfig<TOpen>;
  history: OrdersTabConfig<THistory>;
  initialTab?: OrdersTabKey;
  activeTab?: OrdersTabKey;
  onTabChange?: (tab: OrdersTabKey) => void;
  /**
   * Restricts the orders network picker to these chains, on top of the
   * chains the loaded items are on.
   */
  enabledChainIds?: CaipChainId[];
}
