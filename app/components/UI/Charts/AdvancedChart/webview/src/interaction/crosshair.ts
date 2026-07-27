// Crosshair → CROSSHAIR_MOVE message bridge + short-tap dismiss.
//
// Subscribes to TradingView's crossHairMoved() and posts the nearest OHLCV
// bar to RN. RN side's parseWebViewMessage routes this to onCrosshairMove,
// and AdvancedChart.tsx's OHLCVBar component reads `payload.data`.
//
// Also subscribes to mouse_down / mouse_up so a short tap (< 400ms) after a
// visible crosshair session dismisses the OHLCV bar — matches legacy
// chartLogic.js (~lines 5742-5779). Without this the OHLCV bar lingers
// forever after a long-press shows it.
//
// Ported from chartLogic.js (~line 5672) but simplified:
// - No custom DOM crosshair-label drawing (Phase 4 deleted that)
// - No marker hit-test bookkeeping (Phase 5's overlays/tradeMarkers owns it)

import { postToRN, reportErrorToRN } from '../core/bridge';
import { getOhlcvData } from '../core/state';
import type {
  OHLCVBar,
  TVActiveChart,
  TVChartingLibraryWidget,
  TVCrosshairParams,
} from '../core/types';
import type { CrosshairData } from '../messages/contract';

interface CrosshairSession {
  visible: boolean;
  shownAt: number;
  dismissUntil: number;
  tooltipInteractSent: boolean;
  mouseDownAt: number;
}

const session: CrosshairSession = {
  visible: false,
  shownAt: 0,
  dismissUntil: 0,
  tooltipInteractSent: false,
  mouseDownAt: 0,
};

const SHORT_TAP_MS = 400;
const SYNTHETIC_CLICK_GUARD_MS = 500;
const DISMISS_WINDOW_MS = 800;
const DISMISS_RN_DELAY_MS = 50;

function nearestBar(timeSec: number, data: OHLCVBar[]): OHLCVBar | null {
  if (data.length === 0) return null;
  const targetMs = timeSec * 1000;
  let best: OHLCVBar | null = null;
  let bestDiff = Infinity;
  for (const bar of data) {
    const diff = Math.abs(bar.time - targetMs);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = bar;
    }
  }
  return best;
}

function toCrosshairData(bar: OHLCVBar | null): CrosshairData | null {
  if (!bar) return null;
  return {
    time: bar.time,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    volume: bar.volume,
  };
}

/**
 * Subscribes the chart's crosshair-move event. Each tick posts CROSSHAIR_MOVE
 * with the nearest OHLCV bar shaped as CrosshairData, or null when the
 * crosshair dismisses or when we're inside the post-tap dismiss window.
 */
export function attachCrosshairListener(chart: TVActiveChart): void {
  try {
    const subscription = chart.crossHairMoved();
    subscription.subscribe(null, (params: TVCrosshairParams) => {
      if (params?.price === undefined || params?.time === undefined) {
        postToRN('CROSSHAIR_MOVE', { data: null });
        return;
      }
      if (Date.now() < session.dismissUntil) {
        postToRN('CROSSHAIR_MOVE', { data: null });
        return;
      }
      const bar = nearestBar(params.time, getOhlcvData());
      if (!session.visible) {
        session.shownAt = Date.now();
      }
      session.visible = true;
      if (bar && !session.tooltipInteractSent) {
        postToRN('CHART_INTERACTED', { interaction_type: 'tooltip' });
        session.tooltipInteractSent = true;
      }
      postToRN('CROSSHAIR_MOVE', { data: toCrosshairData(bar) });
    });
  } catch (error) {
    reportErrorToRN(error);
  }
}

/**
 * Subscribes mouse_down / mouse_up so a short tap after a long-press-shown
 * crosshair dismisses the OHLCV bar on the RN side. TV's built-in crosshair
 * line will stay on the chart (no TV API for programmatic dismiss); only the
 * RN-side OHLCV bar reads `CROSSHAIR_MOVE { data: null }` to hide itself.
 */
export function attachTapDismiss(widget: TVChartingLibraryWidget): void {
  try {
    widget.subscribe('mouse_down', () => {
      session.mouseDownAt = Date.now();
      session.dismissUntil = 0;
    });
    widget.subscribe('mouse_up', () => {
      if (!session.visible) return;
      const pressDuration = Date.now() - session.mouseDownAt;
      if (pressDuration >= SHORT_TAP_MS) return;
      // Avoid dismissing the bar in response to the synthetic mouse-up that
      // fires when a long-press finally releases — only dismiss if the bar
      // has been visible long enough to be a deliberate "second tap".
      if (Date.now() - session.shownAt < SYNTHETIC_CLICK_GUARD_MS) return;
      session.visible = false;
      session.shownAt = 0;
      session.dismissUntil = Date.now() + DISMISS_WINDOW_MS;
      setTimeout(() => {
        session.tooltipInteractSent = false;
        postToRN('CROSSHAIR_MOVE', { data: null });
      }, DISMISS_RN_DELAY_MS);
    });
  } catch (error) {
    reportErrorToRN(error);
  }
}

/** Test-only: reset the module-local crosshair session state. */
export function __resetCrosshairForTests(): void {
  session.visible = false;
  session.shownAt = 0;
  session.dismissUntil = 0;
  session.tooltipInteractSent = false;
  session.mouseDownAt = 0;
}
