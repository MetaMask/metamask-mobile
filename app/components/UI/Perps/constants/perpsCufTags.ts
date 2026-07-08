/** Sentry tag / span-attribute keys for Perps CUF spans. */
export const PERPS_CUF_TAG = {
  FEATURE: 'feature',
  LIFECYCLE_CONTEXT: 'lifecycle_context',
  VARIANT: 'variant',
  DIRECTION: 'direction',
  ORDER_TYPE: 'order_type',
  SUCCESS: 'success',
  REASON: 'reason',
  TOAST_TO_POSITION_MS: 'toast_to_position_ms',
  BOUNDARY: 'boundary',
} as const;

/** Which surface closed the place-order CUF span. */
export const PERPS_CUF_BOUNDARY = {
  STREAM: 'stream',
  POLL_FALLBACK: 'poll_fallback',
} as const;

/** Account/flow variant tag values. */
export const PERPS_CUF_VARIANT = {
  EMPTY: 'empty',
  POSITION: 'position',
  ORDER: 'order',
  FUNDED: 'funded',
  UNFUNDED: 'unfunded',
} as const;

/** Terminal reasons for the place-order CUF span. */
export const PERPS_CUF_END_REASON = {
  POSITION_NOT_FOUND: 'position_not_found',
  POSITION_FETCH_ERROR: 'position_fetch_error',
  ORDER_FAILED: 'order_failed',
  EXCEPTION: 'exception',
  STREAM_TIMEOUT: 'stream_timeout',
} as const;

/** How long the place-order span may wait for the position stream to close it. */
export const PERPS_CUF_STREAM_TIMEOUT_MS = 30000;
