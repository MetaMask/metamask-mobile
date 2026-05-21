/**
 * SET_LINE_CHROME message handler — separated to avoid circular deps
 * between lineChrome.ts and overlay/layout modules.
 */

import { getState } from './state';
import type { ChartConfig } from './types';
import { getLineChrome, resolveLineChromeFromPayload } from './lineChrome';
import { clearLineEndDotVisibleRangeDebounce } from './lineEndDot';
import { applyChartScaleLayout } from './chartLayout';
import {
  refreshLineChartOverlays,
  createLastPriceLine,
  removeAllLastPriceHorizontalOverlays,
} from './lastPrice';
import {
  hideCustomCrosshairLabels,
  scheduleLastCloseLabelUpdate,
} from './overlays';

export function handleSetLineChrome(payload: unknown): void {
  const resolved = resolveLineChromeFromPayload(payload);
  if (!resolved) return;
  const s = getState();
  s.CONFIG = s.CONFIG || ({} as ChartConfig);
  s.CONFIG.lineChrome = resolved;
  if (!resolved.useCustomLineEndMarker) {
    clearLineEndDotVisibleRangeDebounce();
  }
  if (!resolved.useCustomPriceLabels) {
    s.lastCloseLabelScheduled = false;
  }
  if (!s.isChartReady || !s.chartWidget) return;
  applyChartScaleLayout(s.currentChartType, {
    hideCustomCrosshairLabels,
    scheduleLastCloseLabelUpdate,
  });
  if (s.currentChartType === 2) {
    refreshLineChartOverlays();
  } else if (s.currentChartType === 1) {
    if (getLineChrome().useCustomDashedLastPriceLine) {
      createLastPriceLine();
    } else {
      removeAllLastPriceHorizontalOverlays({
        hideLastCloseDom: !getLineChrome().useCustomPriceLabels,
      });
      scheduleLastCloseLabelUpdate();
    }
  }
}
