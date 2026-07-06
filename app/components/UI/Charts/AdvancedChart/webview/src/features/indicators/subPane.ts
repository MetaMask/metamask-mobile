// Sub-pane height ratio handler.
//
// Ported from chartLogic.js handleSetSubPaneLayout (~line 783) +
// applySubPaneHeightRatio (~line 750). The consumer-supplied ratio
// (subPaneHeightRatio prop) governs the size of RSI/MACD sub-panes.

import { reportErrorToRN } from '../../core/bridge';
import {
  getStudyPaneIndexMap,
  getSubPaneHeightRatio,
  getWidget,
  isChartReady,
  setSubPaneHeightRatio,
} from '../../core/state';
import type { TVActiveChart } from '../../core/types';
import type { SetSubPaneLayoutMessage } from '../../messages/contract';

const MIN_MAIN_PX = 72;

export function hasActiveSubPaneIndicators(): boolean {
  return getStudyPaneIndexMap().size > 0;
}

export function applySubPaneHeightRatio(chart: TVActiveChart): void {
  const ratio = getSubPaneHeightRatio();
  if (ratio === null) return;
  try {
    const heights = chart.getAllPanesHeight();
    if (heights.length < 2) return;
    const total = heights.reduce((sum, h) => sum + h, 0);
    const bottomCount = heights.length - 1;

    let bottomTotal = Math.round(total * ratio * bottomCount);
    let main = total - bottomTotal;
    if (main < MIN_MAIN_PX) {
      main = MIN_MAIN_PX;
      bottomTotal = total - main;
    }

    const newHeights = [main];
    let remaining = bottomTotal;
    for (let i = 0; i < bottomCount; i++) {
      const h =
        i === bottomCount - 1
          ? remaining
          : Math.floor(bottomTotal / bottomCount);
      newHeights.push(h);
      remaining -= h;
    }
    chart.setAllPanesHeight(newHeights);
  } catch (error) {
    reportErrorToRN(error);
  }
}

export function handleSetSubPaneLayout(
  payload: SetSubPaneLayoutMessage['payload'],
): void {
  if (payload.heightRatio == null) {
    setSubPaneHeightRatio(null);
    return;
  }
  const ratio = payload.heightRatio;
  if (typeof ratio !== 'number' || !(ratio > 0 && ratio <= 1)) {
    return;
  }
  setSubPaneHeightRatio(ratio);

  const widget = getWidget();
  if (widget && isChartReady() && hasActiveSubPaneIndicators()) {
    applySubPaneHeightRatio(widget.activeChart());
  }
}
