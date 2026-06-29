// SET_CHART_TYPE handler — switches between candle (1) and line (2) types.
//
// Ported from chartLogic.js handleSetChartType (~line 2457), stripped of:
// - custom-chrome cleanup (removeAllLastPriceHorizontalOverlays,
//   ensureNoLineChartEndIcons) — deleted in Phase 4
// - chart-interaction analytics suppress — Phase 2's interaction module
//   owns its own debouncing
// - per-type series style re-application — superseded by Phase 1's
//   widget/theme module, which re-applies series colors when needed

import { reportErrorToRN } from '../core/bridge';
import { getWidget, isChartReady, setCurrentChartType } from '../core/state';
import type { SetChartTypeMessage } from '../messages/contract';

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
  } catch (error) {
    reportErrorToRN(error);
  }
}
