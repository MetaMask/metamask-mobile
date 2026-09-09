export const OrdersTabsSelectorsIDs = {
  CONTAINER: 'bridge-orders-tabs',
  TABS_BAR: 'bridge-orders-tabs-bar',
  OPEN_ORDERS_TAB: 'bridge-orders-open-orders-tab',
  HISTORY_TAB: 'bridge-orders-history-tab',
  NETWORK_FILTER_BUTTON: 'bridge-orders-network-filter-button',
  NETWORK_FILTER_AVATAR: 'bridge-orders-network-filter-avatar',
  EMPTY_STATE: 'bridge-orders-empty-state',
  CONTENT: 'bridge-orders-content',
} as const;

export type OrdersTabsSelectorsIDsType = typeof OrdersTabsSelectorsIDs;
