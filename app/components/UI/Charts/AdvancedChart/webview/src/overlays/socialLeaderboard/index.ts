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
 * How long (ms) to keep re-asserting the centered visible range for a
 * historical frame. A one-shot `setVisibleRange` issued during the post-load
 * settle is overridden by TradingView's default "scroll to latest" positioning,
 * so we re-apply every animation frame for this window — the same thing the
 * animated focusTime slide does implicitly, which a single auto-center call did
 * not. Kept short so it never fights a real user gesture.
 */
const CENTER_HOLD_MS = 700;

/** Bumped on each hold so a newer center / fresh series cancels an in-flight hold. */
let centerHoldGeneration = 0;

/**
 * Re-asserts `setVisibleRange({ from, to })` every animation frame for
 * {@link CENTER_HOLD_MS}, defeating TradingView's post-load scroll-to-latest
 * that clobbers a single call. Generation- and data-guarded so a newer center
 * or a fresh series stops it; no-ops once the widget is torn down.
 *
 * Deliberately omits the `{ percentRightMargin: 0 }` option: passing it makes
 * TradingView anchor to the latest candle and ignore an older from/to, so a
 * historical frame (an old position's trades) would snap back to "today".
 */
function holdCenteredVisibleRange(
  chart: TVActiveChart,
  fromSec: number,
  toSec: number,
): void {
  centerHoldGeneration += 1;
  const gen = centerHoldGeneration;
  const dataGeneration = getOhlcvGeneration();
  const startTs = Date.now();

  const apply = (): void => {
    if (gen !== centerHoldGeneration) return;
    if (dataGeneration !== getOhlcvGeneration()) return;
    if (!getWidget() || !isChartReady()) return;
    try {
      chart.setVisibleRange({ from: fromSec, to: toSec });
    } catch {
      // setVisibleRange can throw every frame while the chart is mid-teardown;
      // swallow silently so the hold window doesn't spam errors to RN.
    }
    if (Date.now() - startTs < CENTER_HOLD_MS) {
      try {
        requestAnimationFrame(apply);
      } catch {
        setTimeout(apply, 16);
      }
    }
  };

  apply();
}

/**
 * Centers the viewport on the SLB trade window after a data load.
 *
 * Called from ohlcvIngestion's `applyVisibleRange` when `slbMode` is active.
 * Uses `visibleFromMs` / `visibleToMs` to frame the viewport, with a 2-bar
 * padding on each side so the edge candles aren't glued to the chart border.
 *
 * The centering flag is cleared after success so subsequent REALTIME_UPDATE
 * messages don't re-trigger the slide. Only a fresh SET_OHLCV_DATA resets it.
 *
 * When `options.immediate` is true, applies centering synchronously instead of
 * waiting for `onDataLoaded`. Used after `setResolution` where TradingView has
 * already completed its data cycle by the time the callback fires.
 */
export function slbCenterViewport(
  chart: TVActiveChart,
  options?: { immediate?: boolean },
): void {
  if (!getSlbMode() || !isSlbCenteringPending()) return;

  const fromMs = getVisibleFromMs();
  const toMs = getVisibleToMs();
  if (fromMs == null || toMs == null) return;

  const capturedGeneration = getOhlcvGeneration();

  const applyCenter = (): void => {
    if (capturedGeneration !== getOhlcvGeneration()) return;
    if (!isSlbCenteringPending()) return;

    const data = getOhlcvData();
    const barPadSec = getApproxBarDurationSec(data) * 2;
    const fromSec = Math.floor(fromMs / 1000) - barPadSec;
    const toSec = Math.ceil(toMs / 1000) + barPadSec;

    // A frame whose right edge sits before the latest loaded bar is a historical
    // position (an old, closed trade range). TradingView's post-load
    // scroll-to-latest clobbers a single `setVisibleRange`, and
    // `percentRightMargin: 0` re-anchors it to the latest candle — together they
    // snap the viewport back to "today" and push the trades off-screen. Re-assert
    // the range across the settle window (without that option) so the historical
    // frame sticks. A frame ending at/after the latest bar is the trailing window:
    // TV doesn't fight it, so a single anchored call is enough.
    const lastBar = data.at(-1);
    const lastBarSec = lastBar != null ? Math.floor(lastBar.time / 1000) : null;
    const isHistoricalFrame =
      lastBarSec != null && Math.ceil(toMs / 1000) < lastBarSec;

    try {
      if (isHistoricalFrame) {
        holdCenteredVisibleRange(chart, fromSec, toSec);
      } else {
        chart.setVisibleRange(
          { from: fromSec, to: toSec },
          { percentRightMargin: 0 },
        );
      }
      setSlbCenteringPending(false);
    } catch (error) {
      reportErrorToRN(error);
    }
  };

  if (options?.immediate) {
    applyCenter();
    return;
  }

  const subscription = chart.onDataLoaded();
  const onLoaded = (): void => {
    subscription.unsubscribe(null, onLoaded);
    applyCenter();
  };
  subscription.subscribe(null, onLoaded);
}

/** Test-only: reset the center-hold generation counter between cases. */
export function __resetSocialLeaderboardForTests(): void {
  centerHoldGeneration = 0;
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
