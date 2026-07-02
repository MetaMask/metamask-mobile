// SET_CHART_TYPE handler — switches between candle (1) and line (2) types.
//
// Ported from chartLogic.js handleSetChartType (~line 2457). After
// setChartType, the legacy code calls applyChartScaleLayout to re-apply
// pane margins + right-scale binding; without it the line chart auto-fits
// to close-only and looks "zoomed in" vs the candle chart's high/low range.

import { reportErrorToRN } from '../core/bridge';
import { getWidget, isChartReady, setCurrentChartType } from '../core/state';
import type { SetChartTypeMessage } from '../messages/contract';
import { applyScaleLayout } from './scaleLayout';

export function handleSetChartType(
  payload: SetChartTypeMessage['payload'],
): void {
  const widget = getWidget();
  if (!widget) {
    // Widget not built yet; persist the desired type so initChart picks it up.
    setCurrentChartType(payload.type);
    return;
  }

  setCurrentChartType(payload.type);

  if (!isChartReady()) {
    return;
  }

  try {
    widget.activeChart().setChartType(payload.type);
    applyScaleLayout(payload.type);
    // TradingView may rebind scales asynchronously after a type switch; the
    // legacy code re-applies on the next animation frame for the line chart.
    // Doing it for both types is safe.
    requestAnimationFrame(() => applyScaleLayout(payload.type));
  } catch (error) {
    reportErrorToRN(error);
  }
}

export { ChartType } from '../core/types';
