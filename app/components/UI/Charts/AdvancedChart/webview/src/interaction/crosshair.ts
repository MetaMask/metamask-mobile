// Crosshair → CROSSHAIR_MOVE message bridge.
//
// Subscribes to TradingView's crossHairMoved() and posts the nearest OHLCV
// bar to RN. RN side's parseWebViewMessage routes this to onCrosshairMove.
//
// Ported from chartLogic.js (~line 5672) but simplified:
// - No custom DOM crosshair-label drawing (Phase 4 deleted that)
// - No tooltip-CHART_INTERACTED side channel (visibleRange.ts owns analytics)
// - No marker hit-test bookkeeping (Phase 5's overlays/tradeMarkers owns it)

import { postToRN, reportErrorToRN } from '../core/bridge';
import { getOhlcvData } from '../core/state';
import type { OHLCVBar, TVActiveChart, TVCrosshairParams } from '../core/types';

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

/**
 * Subscribes the chart's crosshair-move event. Each tick posts CROSSHAIR_MOVE
 * with the nearest OHLCV bar, or null when the crosshair dismisses.
 */
export function attachCrosshairListener(chart: TVActiveChart): void {
  try {
    const subscription = chart.crossHairMoved();
    subscription.subscribe(null, (params: TVCrosshairParams) => {
      if (!params || params.price === undefined || params.time === undefined) {
        postToRN('CROSSHAIR_MOVE', { bar: null });
        return;
      }
      const bar = nearestBar(params.time, getOhlcvData());
      postToRN('CROSSHAIR_MOVE', { bar });
    });
  } catch (error) {
    reportErrorToRN(error);
  }
}
