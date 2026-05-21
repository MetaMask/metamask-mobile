import type { OHLCVBar } from './types';

/**
 * TradingView `variable_tick_size` string.
 *
 * Tells TradingView to dynamically adjust pricescale/minmov based on
 * the current price level. Format: "tickSize threshold tickSize threshold …"
 * where each tickSize applies for prices below the next threshold, and
 * the last tickSize applies to all prices above the last threshold.
 */
export const VARIABLE_TICK_SIZE = [
  '0.0000000001',
  '0.000001', // prices < $0.000001 → 10 dp
  '0.00000001',
  '0.0001', // prices < $0.0001   →  8 dp
  '0.000001',
  '0.01', // prices < $0.01     →  6 dp
  '0.0001',
  '1', // prices < $1        →  4 dp
  '0.01',
  '10000', // prices < $10000    →  2 dp
  '0.1', // prices ≥ $10000    →  1 dp
].join(' ');

export const SUPPORTED_RESOLUTIONS = [
  '1',
  '3',
  '5',
  '15',
  '30',
  '60',
  '120',
  '240',
  '480',
  '720',
  '1D',
  '3D',
  '1W',
  '1M',
] as const;

export const OHLCV_BASE_URL = 'https://price.api.cx.metamask.io/v3/ohlcv-chart';

/**
 * Filters bars within a time range [fromMs, toMs), returning up to `countBack` bars.
 * If fewer bars exist in the strict range, falls back to the last `countBack` bars before `toMs`.
 */
export function filterBarsForRange(
  ohlcvData: OHLCVBar[],
  fromMs: number,
  toMs: number,
  countBack: number,
): OHLCVBar[] {
  let barsInRange: OHLCVBar[] = [];
  for (const b of ohlcvData) {
    if (b.time >= fromMs && b.time < toMs) {
      barsInRange.push({
        time: b.time,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
        volume: b.volume,
      });
    }
  }

  if (barsInRange.length < countBack) {
    const allBeforeTo: OHLCVBar[] = [];
    for (const bar of ohlcvData) {
      if (bar.time < toMs) {
        allBeforeTo.push(bar);
      }
    }
    const startIdx = Math.max(0, allBeforeTo.length - countBack);
    barsInRange = [];
    for (let k = startIdx; k < allBeforeTo.length; k++) {
      const bar = allBeforeTo[k];
      barsInRange.push({
        time: bar.time,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
      });
    }
  }

  return barsInRange;
}

export interface FetchOlderBarsParams {
  onResult: (bars: OHLCVBar[], meta: { noData: boolean }) => void;
  oldestAtDefer: number;
}

export interface FetchOlderBarsDeps {
  getOhlcvPagination: () => {
    nextCursor: string | null;
    hasMore: boolean;
    assetId: string | null;
    vsCurrency: string | null;
  };
  getOhlcvGeneration: () => number;
  getOhlcvData: () => OHLCVBar[];
  setOhlcvData: (data: OHLCVBar[]) => void;
  updatePagination: (cursor: string | null, hasNext: boolean) => void;
  onLayoutSettlePending: () => void;
  sendDebug: (message: string) => void;
  fetchFn?: typeof fetch;
}

/**
 * Fetches the next page of OHLCV history directly from the Price API.
 * Called from `getBars` when pagination has a cursor, avoiding the RN round-trip.
 *
 * Dependencies are injected so this function is testable without `window.*` globals.
 */
export function fetchOlderBars(
  pending: FetchOlderBarsParams,
  deps: FetchOlderBarsDeps,
): void {
  const pag = deps.getOhlcvPagination();

  if (!pag.nextCursor || !pag.hasMore || !pag.assetId) {
    pending.onResult([], { noData: true });
    deps.onLayoutSettlePending();
    return;
  }

  const gen = deps.getOhlcvGeneration();
  const url =
    OHLCV_BASE_URL +
    '/' +
    pag.assetId +
    '?' +
    'nextCursor=' +
    encodeURIComponent(pag.nextCursor) +
    (pag.vsCurrency ? '&vsCurrency=' + encodeURIComponent(pag.vsCurrency) : '');

  const doFetch = deps.fetchFn || fetch;

  doFetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error('OHLCV API error: ' + response.status);
      }
      return response.json();
    })
    .then((result) => {
      if (gen !== deps.getOhlcvGeneration()) {
        return;
      }

      if (!result || !Array.isArray(result.data)) {
        throw new Error('OHLCV API response: invalid payload');
      }

      const newBars: OHLCVBar[] = [];
      for (const c of result.data) {
        newBars.push({
          time: c.timestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume,
        });
      }

      deps.updatePagination(result.nextCursor || null, !!result.hasNext);

      if (newBars.length > 0) {
        deps.setOhlcvData(newBars.concat(deps.getOhlcvData()));
      }

      const olderBars: OHLCVBar[] = [];
      for (const nb of newBars) {
        if (nb.time < pending.oldestAtDefer) {
          olderBars.push(nb);
        }
      }

      pending.onResult(olderBars, { noData: olderBars.length === 0 });
      deps.onLayoutSettlePending();
    })
    .catch((err) => {
      if (gen !== deps.getOhlcvGeneration()) {
        return;
      }
      pending.onResult([], { noData: true });
      deps.onLayoutSettlePending();
      deps.sendDebug('fetchOlderBars error: ' + (err.message || String(err)));
    });
}
