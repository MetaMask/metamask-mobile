/** Sentry tag / span-attribute keys for Perps CUF spans. */
export const PERPS_CUF_TAG = {
  FEATURE: 'feature',
  LIFECYCLE_CONTEXT: 'lifecycle_context',
  VARIANT: 'variant',
  DIRECTION: 'direction',
  ORDER_TYPE: 'order_type',
  SUCCESS: 'success',
  REASON: 'reason',
  /** Signed ms between confirmation toast and position render; positive = position rendered after the toast. */
  TOAST_POSITION_DELTA_MS: 'toast_position_delta_ms',
  BOUNDARY: 'boundary',
} as const;

/** Which surface closed the place-order CUF span. */
export const PERPS_CUF_BOUNDARY = {
  STREAM: 'stream',
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
  ORDER_FAILED: 'order_failed',
  REQUEST_FAILED: 'request_failed',
  EXCEPTION: 'exception',
  STREAM_TIMEOUT: 'stream_timeout',
  /** A newer operation of the same flow replaced this one before it confirmed. */
  SUPERSEDED: 'superseded',
  /** The stream was reset (disconnect / account or network switch) before the
   * confirmation arrived, so the op was abandoned rather than confirmed. */
  DISCONNECTED: 'disconnected',
  /** The controller request never settled (hung) before the watchdog fired —
   * distinct from a settled request whose stream render never arrived. */
  CONTROLLER_TIMEOUT: 'controller_timeout',
} as const;

/** How long the place-order span may wait for the position stream to close it. */
export const PERPS_CUF_STREAM_TIMEOUT_MS = 30000;

/**
 * How long the success path waits for the stream to render the position
 * before unblocking the confirmation toast without it.
 */
export const PERPS_CUF_STREAM_CONFIRM_RACE_MS = 1000;
