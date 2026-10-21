/**
 * Screen ids for the render-vs-network check on token details, perps market
 * details, and predict crypto up/down details.
 *
 * The registry keeps one record per id, so each point is its own probe:
 * `perf-ttc-<screenId>_<point>`. These ids are read from the accessibility
 * probe only. Do not pass them through `useScreenPerformance` — `token_details`
 * contains a substring Sentry's scrubber redacts.
 */
export const DeferredRenderScreenIds = {
  TOKEN_DETAILS: 'token_details',
  PERPS_MARKET_DETAILS: 'perps_market_details',
  PREDICT_UPDOWN_DETAILS: 'predict_updown_details',
} as const;

export type DeferredRenderScreenId =
  (typeof DeferredRenderScreenIds)[keyof typeof DeferredRenderScreenIds];

export const DeferredRenderPoint = {
  NAV_START: 'nav_start',
  FIRST_RENDER: 'first_render',
  CHART_DATA_READY: 'chart_data_ready',
  CHART_READY: 'chart_ready',
} as const;

/**
 * Perps chart implementation for a sample.
 * `mixed` means more than one implementation mounted after nav start.
 */
export type PerpsChartRenderPath = 'advanced' | 'tradingview' | 'mixed';

/** Implementation that can actually mount. `mixed` is a snapshot only. */
export type PerpsMountedChartPath = Exclude<PerpsChartRenderPath, 'mixed'>;

/** Probe id for the mounted perps chart implementation. */
export const PERPS_MARKET_DETAILS_CHART_PATH_PROBE_ID =
  'perps_market_details_chart_path' as const;

/** Probe id recorded when the performance-build flag pin throws. */
export const PERPS_MARKET_DETAILS_CHART_PIN_PROBE_ID =
  'perps_market_details_chart_pin' as const;

export type DeferredRenderExtraProbeId =
  | typeof PERPS_MARKET_DETAILS_CHART_PATH_PROBE_ID
  | typeof PERPS_MARKET_DETAILS_CHART_PIN_PROBE_ID;

export type DeferredRenderPointId =
  (typeof DeferredRenderPoint)[keyof typeof DeferredRenderPoint];

/** `<screenId>_<point>`, matching the registry label charset `[a-z0-9_]+`. */
export type DeferredRenderProbeId =
  `${DeferredRenderScreenId}_${DeferredRenderPointId}`;

export function deferredRenderProbeId(
  screenId: DeferredRenderScreenId,
  point: DeferredRenderPointId,
): DeferredRenderProbeId {
  return `${screenId}_${point}`;
}
