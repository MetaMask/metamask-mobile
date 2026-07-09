// Module-local state container for the AdvancedChart WebView.
//
// Replaces the legacy `window.chartWidget`, `window.isChartReady`,
// `window.currentSymbol`, etc. (chartLogic.js lines ~21-60). Module-scoped
// variables — not window.* globals — so behaviour is testable and ownership
// is explicit. Future phases extend this with the OHLCV slice, the indicator
// slice, and so on; the convention is "core state goes here, feature-local
// state goes in features/<feature>/state.ts or overlays/<feature>/state.ts".

import type {
  ChartTheme,
  ChartType,
  OHLCVBar,
  OHLCVPaginationConfig,
  RealtimeTickCallback,
  StudyId,
  TVChartingLibraryWidget,
} from './types';

interface CoreState {
  widget: TVChartingLibraryWidget | null;
  isChartReady: boolean;
  currentSymbol: string;
  currentResolution: string;
  currentChartType: ChartType;
  theme: ChartTheme | null;
  libraryLoaded: boolean;
  libraryError: string | null;
  ohlcvData: OHLCVBar[];
  /** Bumped on every SET_OHLCV_DATA; stale async resolutions discard via this token. */
  ohlcvGeneration: number;
  ohlcvPagination: OHLCVPaginationConfig;
  /** Visible-range bounds (ms) for the next setVisibleRange after reset; null = use TV default. */
  visibleFromMs: number | null;
  visibleToMs: number | null;
  /** TradingView subscribeBars listenerGuid → tick callback (forwarded by REALTIME_UPDATE). */
  realtimeCallbacks: Record<string, RealtimeTickCallback>;
  /** Curated indicators (MACD, RSI, BOL, MA200) keyed by indicator name → studyId. */
  activeStudies: Map<string, StudyId>;
  /** MA visibility-driven studies (MA5/10/20/50/200) keyed by name → studyId. */
  maStudies: Map<string, StudyId>;
  /** Insertion order used to render legend pills consistently across renders. */
  legendStudyOrder: Map<string, StudyId>;
  volumeStudyId: StudyId | null;
  /** null when no volume; tracks overlay vs sub-pane for toggle continuity. */
  volumeIsOverlay: boolean | null;
  /** Effective ratio in (0, 1] for sub-pane height; null = TV default. */
  subPaneHeightRatio: number | null;
  /** When enabled, getBars sends FETCH_OLDER_BARS_REQUEST to RN instead of Price API. */
  rnBackedPagination: { enabled: boolean };
  /** True when position lines include a currentPrice line; hides TV's native price line. */
  hasExplicitCurrentPriceLine: boolean;
  /** Sequence counter for setResolution callbacks; stale callbacks bail when mismatched. */
  hotReloadSeq: number;
  /** True between setResolution call and its callback; getBars returns noData during this window. */
  inHotReloadPreResetPhase: boolean;
  /** SLB scoping flag — activates Strategy C (bulk back-fill) pagination. */
  slbMode: boolean;
  /**
   * Set to true when SLB data arrives and the viewport hasn't been
   * centered yet. Cleared after the first successful setVisibleRange
   * so re-centering only happens on a fresh SET_OHLCV_DATA.
   */
  slbCenteringPending: boolean;
}

const emptyPagination = (): OHLCVPaginationConfig => ({
  nextCursor: null,
  hasMore: false,
  assetId: null,
  vsCurrency: null,
});

const state: CoreState = {
  widget: null,
  isChartReady: false,
  currentSymbol: 'ASSET',
  currentResolution: '5',
  currentChartType: 2,
  theme: null,
  libraryLoaded: false,
  libraryError: null,
  ohlcvData: [],
  ohlcvGeneration: 0,
  ohlcvPagination: emptyPagination(),
  visibleFromMs: null,
  visibleToMs: null,
  realtimeCallbacks: {},
  activeStudies: new Map(),
  maStudies: new Map(),
  legendStudyOrder: new Map(),
  volumeStudyId: null,
  volumeIsOverlay: null,
  subPaneHeightRatio: null,
  rnBackedPagination: { enabled: false },
  hasExplicitCurrentPriceLine: false,
  hotReloadSeq: 0,
  inHotReloadPreResetPhase: false,
  slbMode: false,
  slbCenteringPending: false,
};

// ----- Widget lifecycle ---------------------------------------------------

export function getWidget(): TVChartingLibraryWidget | null {
  return state.widget;
}

export function setWidget(widget: TVChartingLibraryWidget | null): void {
  state.widget = widget;
}

export function isChartReady(): boolean {
  return state.isChartReady;
}

export function setChartReady(ready: boolean): void {
  state.isChartReady = ready;
}

// ----- Symbol + resolution ------------------------------------------------

export function getCurrentSymbol(): string {
  return state.currentSymbol;
}

export function setCurrentSymbol(symbol: string): void {
  state.currentSymbol = symbol;
}

export function getCurrentResolution(): string {
  return state.currentResolution;
}

export function setCurrentResolution(resolution: string): void {
  state.currentResolution = resolution;
}

// ----- Theme --------------------------------------------------------------

export function getTheme(): ChartTheme | null {
  return state.theme;
}

export function setTheme(theme: ChartTheme): void {
  state.theme = theme;
}

// ----- Library load -------------------------------------------------------

export function isLibraryLoaded(): boolean {
  return state.libraryLoaded;
}

export function setLibraryLoaded(loaded: boolean): void {
  state.libraryLoaded = loaded;
}

export function getLibraryError(): string | null {
  return state.libraryError;
}

export function setLibraryError(error: string | null): void {
  state.libraryError = error;
}

// ----- Chart type --------------------------------------------------------

export function getCurrentChartType(): ChartType {
  return state.currentChartType;
}

export function setCurrentChartType(type: ChartType): void {
  state.currentChartType = type;
}

// ----- OHLCV data --------------------------------------------------------

export function getOhlcvData(): OHLCVBar[] {
  return state.ohlcvData;
}

export function setOhlcvData(data: OHLCVBar[]): void {
  state.ohlcvData = data;
}

export function appendOrReplaceLastBar(bar: OHLCVBar): void {
  const data = state.ohlcvData;
  const last = data.at(-1);
  if (data.length > 0 && last?.time === bar.time) {
    data[data.length - 1] = bar;
  } else {
    data.push(bar);
  }
}

export function prependOhlcvBars(bars: OHLCVBar[]): void {
  state.ohlcvData = bars.concat(state.ohlcvData);
}

export function getOhlcvGeneration(): number {
  return state.ohlcvGeneration;
}

export function bumpOhlcvGeneration(): number {
  state.ohlcvGeneration += 1;
  return state.ohlcvGeneration;
}

export function getOhlcvPagination(): OHLCVPaginationConfig {
  return state.ohlcvPagination;
}

export function setOhlcvPagination(pagination: OHLCVPaginationConfig): void {
  state.ohlcvPagination = pagination;
}

export function clearOhlcvPagination(): void {
  state.ohlcvPagination = emptyPagination();
}

// ----- Visible range ------------------------------------------------------

export function getVisibleFromMs(): number | null {
  return state.visibleFromMs;
}

export function setVisibleFromMs(ms: number | null): void {
  state.visibleFromMs = ms;
}

export function getVisibleToMs(): number | null {
  return state.visibleToMs;
}

export function setVisibleToMs(ms: number | null): void {
  state.visibleToMs = ms;
}

// ----- Realtime tick subscribers ------------------------------------------

export function registerRealtimeCallback(
  listenerGuid: string,
  cb: RealtimeTickCallback,
): void {
  state.realtimeCallbacks[listenerGuid] = cb;
}

export function unregisterRealtimeCallback(listenerGuid: string): void {
  delete state.realtimeCallbacks[listenerGuid];
}

export function getRealtimeCallbacks(): Record<string, RealtimeTickCallback> {
  return state.realtimeCallbacks;
}

// ----- Indicator studies --------------------------------------------------

export function getActiveStudies(): Map<string, StudyId> {
  return state.activeStudies;
}

export function getMaStudies(): Map<string, StudyId> {
  return state.maStudies;
}

export function getLegendStudyOrder(): Map<string, StudyId> {
  return state.legendStudyOrder;
}

export function registerStudy(
  bucket: 'active' | 'ma',
  name: string,
  studyId: StudyId,
): void {
  if (bucket === 'active') {
    state.activeStudies.set(name, studyId);
  } else {
    state.maStudies.set(name, studyId);
  }
  state.legendStudyOrder.set(name, studyId);
}

export function unregisterStudy(name: string): StudyId | undefined {
  const fromActive = state.activeStudies.get(name);
  const fromMA = state.maStudies.get(name);
  state.activeStudies.delete(name);
  state.maStudies.delete(name);
  state.legendStudyOrder.delete(name);
  return fromActive ?? fromMA;
}

// ----- Volume study -------------------------------------------------------

export function getVolumeStudyId(): StudyId | null {
  return state.volumeStudyId;
}

export function setVolumeStudyId(id: StudyId | null): void {
  state.volumeStudyId = id;
  if (id) {
    state.legendStudyOrder.set('Volume', id);
  } else {
    state.legendStudyOrder.delete('Volume');
  }
}

export function getVolumeIsOverlay(): boolean | null {
  return state.volumeIsOverlay;
}

export function setVolumeIsOverlay(isOverlay: boolean | null): void {
  state.volumeIsOverlay = isOverlay;
}

// ----- Sub-pane height ratio ----------------------------------------------

export function getSubPaneHeightRatio(): number | null {
  return state.subPaneHeightRatio;
}

export function setSubPaneHeightRatio(ratio: number | null): void {
  state.subPaneHeightRatio = ratio;
}

// ----- RN-backed pagination --------------------------------------------------

export function getRnBackedPagination(): { enabled: boolean } {
  return state.rnBackedPagination;
}

export function setRnBackedPagination(config: { enabled: boolean }): void {
  state.rnBackedPagination = config;
}

// ----- Hot-reload sequence guards --------------------------------------------

export function bumpHotReloadSeq(): number {
  state.hotReloadSeq += 1;
  return state.hotReloadSeq;
}

export function getHotReloadSeq(): number {
  return state.hotReloadSeq;
}

export function isInHotReloadPreResetPhase(): boolean {
  return state.inHotReloadPreResetPhase;
}

export function setInHotReloadPreResetPhase(phase: boolean): void {
  state.inHotReloadPreResetPhase = phase;
}

// ----- SLB (Social Leaderboard) mode -----------------------------------------

export function getSlbMode(): boolean {
  return state.slbMode;
}

export function setSlbMode(enabled: boolean): void {
  state.slbMode = enabled;
}

export function isSlbCenteringPending(): boolean {
  return state.slbCenteringPending;
}

export function setSlbCenteringPending(pending: boolean): void {
  state.slbCenteringPending = pending;
}

// ----- Explicit current price line -------------------------------------------

export function getHasExplicitCurrentPriceLine(): boolean {
  return state.hasExplicitCurrentPriceLine;
}

export function setHasExplicitCurrentPriceLine(has: boolean): void {
  state.hasExplicitCurrentPriceLine = has;
}

/**
 * Resets state to defaults — useful for unit tests. NOT for runtime use; the
 * WebView is created fresh per mount (the RN side recreates the HTML when
 * the theme or feature flags change).
 */
export function __resetStateForTests(): void {
  state.widget = null;
  state.isChartReady = false;
  state.currentSymbol = 'ASSET';
  state.currentResolution = '5';
  state.currentChartType = 2;
  state.theme = null;
  state.libraryLoaded = false;
  state.libraryError = null;
  state.ohlcvData = [];
  state.ohlcvGeneration = 0;
  state.ohlcvPagination = emptyPagination();
  state.visibleFromMs = null;
  state.visibleToMs = null;
  state.realtimeCallbacks = {};
  state.activeStudies = new Map();
  state.maStudies = new Map();
  state.legendStudyOrder = new Map();
  state.volumeStudyId = null;
  state.volumeIsOverlay = null;
  state.subPaneHeightRatio = null;
  state.rnBackedPagination = { enabled: false };
  state.hasExplicitCurrentPriceLine = false;
  state.hotReloadSeq = 0;
  state.inHotReloadPreResetPhase = false;
  state.slbMode = false;
  state.slbCenteringPending = false;
}
