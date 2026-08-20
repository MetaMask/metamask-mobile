export const OrdersTabsSelectorsIDs = {
  CONTAINER: 'bridge-orders-tabs',
  TABS_BAR: 'bridge-orders-tabs-bar',
  OPEN_ORDERS_TAB: 'bridge-orders-open-orders-tab',
  HISTORY_TAB: 'bridge-orders-history-tab',
  EMPTY_STATE: 'bridge-orders-empty-state',
  CONTENT: 'bridge-orders-content',
} as const;

export type OrdersTabsSelectorsIDsType = typeof OrdersTabsSelectorsIDs;
