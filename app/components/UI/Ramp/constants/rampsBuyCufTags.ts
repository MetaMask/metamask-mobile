export const RAMPS_BUY_CUF_TAG = {
  FEATURE: 'feature',
  SURFACE: 'surface',
  PATH: 'path',
  SUCCESS: 'success',
  REASON: 'reason',
  BOUNDARY: 'boundary',
  RAMP_TYPE: 'ramp_type',
} as const;

export const RAMPS_BUY_CUF_FEATURE = 'buy';

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

export const RAMPS_BUY_CUF_PATH = {
  WIDGET: 'widget',
  NATIVE: 'native',
} as const;

export const RAMPS_BUY_CUF_BOUNDARY = {
  ORDER_DETAILS: 'order_details',
} as const;

export const RAMPS_BUY_CUF_END_REASON = {
  SUPERSEDED: 'superseded',
  TIMEOUT: 'timeout',
  BAILED: 'bailed',
  ERROR: 'error',
  CANCELLED: 'cancelled',
  ABANDONED: 'abandoned',
  HEADLESS: 'headless',
} as const;

export const RAMPS_BUY_CUF_TIMEOUT_MS = 10 * 60 * 1000;
