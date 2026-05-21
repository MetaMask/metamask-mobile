/**
 * Chart type switching (candle ↔ line).
 */

import { getState, suppressChartUserInteraction } from './state';
import { sendToReactNative } from './bridge';
import { applyChartScaleLayout } from './chartLayout';
import { ensureNoLineChartEndIcons } from './lineEndDot';
import {
  removeAllLastPriceHorizontalOverlays,
  refreshLineChartOverlays,
  createLastPriceLine,
} from './lastPrice';
import { getLineChrome } from './lineChrome';
import {
  hideCustomCrosshairLabels,
  scheduleLastCloseLabelUpdate,
} from './overlays';

import type { SetChartTypePayload } from './types';

export function handleSetChartType(payload: SetChartTypePayload): void {
  suppressChartUserInteraction(500);
  const s = getState();
  if (!s.chartWidget) return;

  const type = payload.type;
  s.currentChartType = type;
  if (!s.isChartReady) return;

  if (type === 2) {
    removeAllLastPriceHorizontalOverlays({
      hideLastCloseDom: !getLineChrome().useCustomPriceLabels,
    });
  } else {
    ensureNoLineChartEndIcons();
  }

  try {
    const ac = s.chartWidget.activeChart();
    ac.setChartType(type);

    const color = s.CONFIG.theme.successColor;
    const series = ac.getSeries();
    if (type === 2) {
      series.setChartStyleProperties(2, {
        color,
        colorType: 'solid',
        linewidth: 2,
      });
    } else if (type === 10) {
      series.setChartStyleProperties(10, {
        topLineColor: color,
        bottomLineColor: color,
        topLineWidth: 2,
        bottomLineWidth: 2,
      });
    }

    applyChartScaleLayout(type, {
      hideCustomCrosshairLabels,
      scheduleLastCloseLabelUpdate,
    });

    const capturedType = type;
    setTimeout(() => {
      if (s.currentChartType !== capturedType) return;
      if (capturedType === 2) {
        refreshLineChartOverlays();
      } else if (capturedType === 1) {
        createLastPriceLine();
      }
    }, 100);
  } catch (error: unknown) {
    sendToReactNative('ERROR', {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
