export const EntitlementsTestIds = {
  SECTION: 'pro-hub-entitlements-section',
  TITLE: 'pro-hub-entitlements-title',
  ROW: (id: string) => `pro-hub-entitlement-row-${id}`,
  SUBLABEL: (id: string) => `pro-hub-entitlement-sublabel-${id}`,
  BADGE: (id: string) => `pro-hub-entitlement-badge-${id}`,
  ACTION: (id: string) => `pro-hub-entitlement-action-${id}`,
  METER: (id: string) => `pro-hub-entitlement-meter-${id}`,
  METER_FILL: (id: string) => `pro-hub-entitlement-meter-fill-${id}`,
} as const;
