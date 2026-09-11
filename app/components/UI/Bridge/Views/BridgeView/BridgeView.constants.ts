/**
 * Tabs rendered by the Bridge view. Values are used as stable keys, matched
 * against `TabsBar`'s filtered tab list by key rather than by index, since
 * the Limit and Recurring tabs may be hidden when their feature flags are
 * disabled.
 */
export enum BridgeTabKey {
  Market = 'market',
  Limit = 'limit',
  Recurring = 'recurring',
}
