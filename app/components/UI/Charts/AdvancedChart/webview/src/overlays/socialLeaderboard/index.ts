// Social Leaderboard (SLB) viewport centering and back-fill pagination.
//
// Implements **Strategy C — SLB bulk back-fill**, the third pagination
// strategy alongside Strategy A (Price API / Token Details) and Strategy B
// (RN-backed / Perps).
//
// ── How it works ──────────────────────────────────────────────────────────
//
//   1. RN pre-loads the complete OHLCV dataset that covers the trade window
//      (visibleFromMs → visibleToMs) and sends it in one SET_OHLCV_DATA
//      message with `slbMode: true`.
//
//   2. The WebView stores the data in core/state and marks viewport centering
//      as pending (`slbCenteringPending = true`).
//
//   3. After the TradingView widget finishes its data load cycle, this module
//      centers the viewport on the trade window so the user sees all relevant
//      trades immediately (no manual scrolling needed).
//
//   4. getBars pagination is a no-op: because RN pre-loaded all data, any
//      getBars call for a time range outside the in-memory dataset returns
//      `{ noData: true }`. There is no second fetch — the dataset is complete.
//
//   5. When the user taps a different trade row, RN re-sends SET_OHLCV_DATA
//      with updated visibleFromMs / visibleToMs. The centering flag resets,
//      and step 3 fires again for the new window.
//
// ── Why a separate strategy? ──────────────────────────────────────────────
//
//   Strategy A (Price API) and Strategy B (RN-backed) both paginate
//   incrementally — fetching one page at a time as the user scrolls left.
//   SLB needs the entire trade window visible from the start, so incremental
//   pagination would cause visible "holes" while pages load. Bulk back-fill
//   avoids this by having RN send all data upfront.
//
// ── Scoping via slbMode ──────────────────────────────────────────────────
//
//   All SLB behavior is gated behind the `slbMode` flag so it cannot affect
//   Token Details, Perps, or any other consumer. When `slbMode` is false
//   (or omitted), this module is inert.

import { reportErrorToRN } from '../../core/bridge';
import {
  getOhlcvData,
  getOhlcvGeneration,
  getVisibleFromMs,
  getVisibleToMs,
  getSlbMode,
  isSlbCenteringPending,
  setSlbCenteringPending,
  getWidget,
  isChartReady,
} from '../../core/state';
import { getApproxBarDurationSec } from '../../core/timeUtils';
import type { TVActiveChart } from '../../core/types';

/**
 * Centers the viewport on the SLB trade window after a data load.
 *
 * Called from ohlcvIngestion's `applyVisibleRange` when `slbMode` is active.
 * Uses `visibleFromMs` / `visibleToMs` to frame the viewport, with a 2-bar
 * padding on each side so the edge candles aren't glued to the chart border.
 *
 * The centering flag is cleared after success so subsequent REALTIME_UPDATE
 * messages don't re-trigger the slide. Only a fresh SET_OHLCV_DATA resets it.
 */
export function slbCenterViewport(chart: TVActiveChart): void {
  if (!getSlbMode() || !isSlbCenteringPending()) return;

  const fromMs = getVisibleFromMs();
  const toMs = getVisibleToMs();
  if (fromMs == null || toMs == null) return;

  const capturedGeneration = getOhlcvGeneration();
  const subscription = chart.onDataLoaded();

  const onLoaded = (): void => {
    subscription.unsubscribe(null, onLoaded);

    if (capturedGeneration !== getOhlcvGeneration()) return;
    if (!isSlbCenteringPending()) return;

    const data = getOhlcvData();
    const barPadSec = getApproxBarDurationSec(data) * 2;
    const fromSec = Math.floor(fromMs / 1000) - barPadSec;
    const toSec = Math.ceil(toMs / 1000) + barPadSec;

    try {
      chart.setVisibleRange(
        { from: fromSec, to: toSec },
        { percentRightMargin: 0 },
      );
      setSlbCenteringPending(false);
    } catch (error) {
      reportErrorToRN(error);
    }
  };

  subscription.subscribe(null, onLoaded);
}

/**
 * Schedules SLB viewport centering after the initial chart-ready event.
 *
 * Called from bootstrap's `onReady` callback. Only fires when the chart
 * loaded with `slbMode` active — for all other consumers this is a no-op.
 */
export function slbScheduleInitialCentering(): void {
  if (!getSlbMode() || !isSlbCenteringPending()) return;

  const widget = getWidget();
  if (!widget || !isChartReady()) return;

  try {
    const chart = widget.activeChart();
    slbCenterViewport(chart);
  } catch (error) {
    reportErrorToRN(error);
  }
}

/**
 * SLB back-fill pagination handler for datafeed.ts getBars.
 *
 * In SLB mode, RN has already sent the complete dataset — there is nothing
 * to fetch. This function simply signals `noData: true` to TradingView,
 * which stops it from requesting more bars.
 *
 * Returns `true` if it handled the request (caller should return early),
 * or `false` if the caller should fall through to the other strategies.
 */
export function slbHandleGetBars(
  onResult: (bars: never[], meta: { noData: boolean }) => void,
): boolean {
  if (!getSlbMode()) return false;
  onResult([], { noData: true });
  return true;
}
