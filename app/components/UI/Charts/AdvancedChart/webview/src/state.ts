/**
 * Centralized WebView global state.
 *
 * All `window.*` chart globals are accessed/mutated through this module so
 * the rest of the codebase never touches `window` directly — making
 * dependencies explicit and tests mockable.
 */

import type {
  OHLCVBar,
  OHLCVPagination,
  ChartConfig,
  TVChartWidget,
  TVEntityId,
  RNMessage,
  CrosshairInteractionState,
} from './types';

export interface ChartState extends CrosshairInteractionState {
  chartWidget: TVChartWidget | null;
  ohlcvData: OHLCVBar[];
  currentSymbol: string;
  activeStudies: Map<string, TVEntityId>;
  positionShapeIds: TVEntityId[];
  isChartReady: boolean;
  pendingMessages: RNMessage[];
  libraryLoaded: boolean;
  libraryError: string | null;
  realtimeCallbacks: Record<string, (tick: OHLCVBar) => void>;
  ohlcvPagination: OHLCVPagination;
  ohlcvGeneration: number;
  visibleFromMs: number | null;
  visibleToMs: number | null;
  currentChartType: number;
  currentResolution: string;
  lineLastPriceShapeId: TVEntityId | null;
  lineChartOhlcvEpoch: number;
  lastPriceShapeId: TVEntityId | null;
  lineEndDotShapeId: TVEntityId | null;
  volumeStudyId: TVEntityId | null;
  volumeIsOverlay: boolean | null;
  lastCloseLabelScheduled: boolean;
  __mmSuppressChartInteractUntil: number;
  __mmTooltipChartInteractSent: boolean;
  __mmLayoutSettlePending: boolean;
  __mmLayoutSettleFallbackTimer: ReturnType<typeof setTimeout> | null;
  __lineLastPriceLinePlacementGen: number;
  __lineEndDotPlacementGen: number;
  CONFIG: ChartConfig;
}

let state: ChartState;

function getWindow(): Window & Record<string, unknown> {
  return typeof window !== 'undefined'
    ? window
    : ({} as Window & Record<string, unknown>);
}

/**
 * Returns the global chart state, lazily initializing from `window` on first access.
 * In tests, call `resetState()` or `setState()` to inject a mock.
 */
export function getState(): ChartState {
  if (!state) {
    state = getWindow() as ChartState;
  }
  return state;
}

/** Replace the state object (for testing). */
export function setState(mock: Partial<ChartState>): void {
  state = mock as ChartState;
}

/** Reset to reading from `window` again (for testing teardown). */
export function resetState(): void {
  state = undefined as unknown as ChartState;
}

export function suppressChartUserInteraction(ms: number): void {
  getState().__mmSuppressChartInteractUntil = Date.now() + (ms || 600);
}

export function bumpLineChartOhlcvEpoch(): void {
  const s = getState();
  s.lineChartOhlcvEpoch = (s.lineChartOhlcvEpoch || 0) + 1;
}
