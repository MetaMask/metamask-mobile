/** Sentry tag / span-attribute keys for Unified Buy quote-fetch spans (TRAM-3805). */
export const RAMPS_QUOTE_FETCH_TAG = {
  FEATURE: 'feature',
  RAMP_TYPE: 'ramp_type',
  PROVIDER: 'provider',
  PATH: 'path',
  CUSTOM_ACTION: 'custom_action',
  SUCCESS: 'success',
  REASON: 'reason',
} as const;

export const RAMPS_QUOTE_FETCH_FEATURE = 'buy';

export const RAMPS_QUOTE_FETCH_RAMP_TYPE = 'UNIFIED_BUY_2';

/** Checkout-path tag when the usable quote is a custom-action (PayPal, etc.). */
export const RAMPS_QUOTE_FETCH_PATH = {
  CUSTOM_ACTION: 'custom_action',
} as const;

/** Terminal reasons when a quote-fetch span ends unsuccessfully. */
export const RAMPS_QUOTE_FETCH_END_REASON = {
  SUPERSEDED: 'superseded',
  ERROR: 'error',
  CANCELLED: 'cancelled',
  /** HTTP succeeded but requested provider(s) returned no usable quote. */
  NO_QUOTE: 'no_quote',
} as const;
