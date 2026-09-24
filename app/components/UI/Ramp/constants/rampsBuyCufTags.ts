export const RAMPS_BUY_CUF_TAG = {
  FEATURE: 'feature',
  SURFACE: 'surface',
  PATH: 'path',
  SUCCESS: 'success',
  REASON: 'reason',
  BOUNDARY: 'boundary',
  RAMP_TYPE: 'ramp_type',
  PROVIDER: 'provider',
  CUSTOM_ACTION: 'custom_action',
  LIFECYCLE_CONTEXT: 'lifecycle_context',
  BACKGROUND_COUNT: 'background_count',
  RESUME_COUNT: 'resume_count',
  SCREEN_ID: 'screen_id',
  CONTENT_STATE: 'content_state',
} as const;

export const RAMPS_BUY_CUF_FEATURE = 'buy';
export const RAMPS_BUY_CUF_FOREGROUND_ACTIVE_MS = 'foreground_active_ms';

/** Greppable marker for Buy CUF span logs in Metro, mirroring Perps. */
export const RAMPS_BUY_CUF_LOG_MARKER = '[RampsBuyCUF]';

/**
 * Launch context a Buy span started in, so cold navigation is never pooled
 * with warm in-session navigation or a background resume. Shares the Perps
 * vocabulary so both features' dashboards split latency the same way.
 */
export const RAMPS_BUY_LIFECYCLE_CONTEXT = {
  COLD_PROCESS: 'cold_process',
  WARM: 'warm',
  BACKGROUND_RESUME: 'background_resume',
} as const;

export type RampsBuyLifecycleContext =
  (typeof RAMPS_BUY_LIFECYCLE_CONTEXT)[keyof typeof RAMPS_BUY_LIFECYCLE_CONTEXT];

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
  CUSTOM_ACTION: 'custom_action',
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
  NO_QUOTE: 'no_quote',
  APP_BACKGROUNDED: 'app_backgrounded',
  UNMOUNTED: 'unmounted',
  DISABLED: 'disabled',
} as const;
/**
 * Buy can legitimately spend significant time in external KYC, banking, or
 * SMS apps. Keep the journey open while bounded child spans own app latency.
 */
export const RAMPS_BUY_CUF_TIMEOUT_MS = 30 * 60 * 1000;
/** Lets the CUF-owned timeout attach outcome/lifecycle data before core cleanup. */
export const RAMPS_BUY_CUF_TRACE_MAX_LIFETIME_MS =
  RAMPS_BUY_CUF_TIMEOUT_MS + 60 * 1000;
