/** Sentry tag / span-attribute keys for Unified Buy CUF spans (TRAM-3779). */
export const RAMPS_BUY_CUF_TAG = {
  FEATURE: 'feature',
  SURFACE: 'surface',
  PATH: 'path',
  SUCCESS: 'success',
  REASON: 'reason',
  BOUNDARY: 'boundary',
  RAMP_TYPE: 'ramp_type',
} as const;

/** Feature tag value for Buy CUF spans (dashboard filter). */
export const RAMPS_BUY_CUF_FEATURE = 'buy';

/** Entry-surface tag values for the Buy E2E parent span. */
export const RAMPS_BUY_CUF_SURFACE = {
  FUND_MENU: 'fund_menu',
  EMPTY_STATE: 'empty_state',
  DEEP_LINK: 'deep_link',
  TOKEN_BUY: 'token_buy',
  HOME_TOKEN_LIST: 'home_token_list',
  HOME: 'home',
  ACCOUNTS_MENU: 'accounts_menu',
  ACTIVITY: 'activity',
  CONFIRMATION: 'confirmation',
  CARD: 'card',
  ORDERS_LIST: 'orders_list',
  CASH: 'cash',
  EARN: 'earn',
  UNKNOWN: 'unknown',
} as const;

export type RampsBuyCufSurface =
  (typeof RAMPS_BUY_CUF_SURFACE)[keyof typeof RAMPS_BUY_CUF_SURFACE];

/** Widget vs native happy-path tag values. */
export const RAMPS_BUY_CUF_PATH = {
  WIDGET: 'widget',
  NATIVE: 'native',
} as const;

/** Which surface closed the Buy E2E CUF span. */
export const RAMPS_BUY_CUF_BOUNDARY = {
  ORDER_DETAILS: 'order_details',
} as const;

/** Terminal reasons when the Buy E2E (or a child) ends as unsuccessful. */
export const RAMPS_BUY_CUF_END_REASON = {
  SUPERSEDED: 'superseded',
  TIMEOUT: 'timeout',
  BAILED: 'bailed',
  ERROR: 'error',
  CANCELLED: 'cancelled',
  ABANDONED: 'abandoned',
  HEADLESS: 'headless',
} as const;

/**
 * How long the Buy E2E parent may stay open before a fallback end.
 * Buy can include KYC / bank steps, so this is longer than Perps stream CUFs.
 */
export const RAMPS_BUY_CUF_TIMEOUT_MS = 10 * 60 * 1000;
