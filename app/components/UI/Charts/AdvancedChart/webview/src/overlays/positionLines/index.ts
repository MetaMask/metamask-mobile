// Position lines overlay (Perps). Renders horizontal dashed lines for entry,
// take-profit, stop-loss, liquidation, and optionally a current-price line.
//
// Ported from chartLogic.js handleSetPositionLines (~line 2624),
// clearPositionLines (~line 2608), and positionShapeIds state.

import { reportErrorToRN } from '../../core/bridge';
import { onDataLifecycle } from '../../core/dataLifecycle';
import {
  getWidget,
  isChartReady,
  getTheme,
  setHasExplicitCurrentPriceLine,
  getHasExplicitCurrentPriceLine,
} from '../../core/state';
import { registerHandler } from '../../messages/handler';
import { getThemeLastPriceLineColor } from '../../widget/theme';
import type { SetPositionLinesPayload } from '../../messages/contract';
import {
  getPositionShapeIds,
  clearPositionShapeIds,
  pushPositionShapeId,
  bumpGeneration,
  getGeneration,
} from './state';

interface PositionLineConfig {
  price: number;
  text?: string;
  color: string;
  lineStyle: number;
  lineWidth: number;
  showLabel: boolean;
  showPrice: boolean;
  horzLabelsAlign: string;
}

function clearPositionLines(): void {
  const widget = getWidget();
  if (!widget || !isChartReady()) {
    clearPositionShapeIds();
    return;
  }
  const chart = widget.activeChart();
  for (const id of getPositionShapeIds()) {
    try {
      chart.removeEntity(id);
    } catch {
      // Shape may already be gone after resetData
    }
  }
  clearPositionShapeIds();
}

export function handleSetPositionLines(payload: SetPositionLinesPayload): void {
  const widget = getWidget();
  if (!widget || !isChartReady()) return;

  bumpGeneration();
  clearPositionLines();

  if (!payload?.position) {
    setHasExplicitCurrentPriceLine(false);
    try {
      widget.applyOverrides({
        'mainSeriesProperties.showPriceLine': true,
      });
    } catch {
      // Best-effort
    }
    return;
  }

  const position = payload.position;
  setHasExplicitCurrentPriceLine(!!position.currentPrice);

  try {
    widget.applyOverrides({
      'mainSeriesProperties.showPriceLine': !getHasExplicitCurrentPriceLine(),
    });
  } catch {
    // Best-effort
  }

  const theme = getTheme();
  if (!theme) return;

  const colors = payload.positionLineColors || ({} as Record<string, string>);
  const currentPriceColor =
    (colors as Record<string, string | undefined>).currentPrice ||
    getThemeLastPriceLineColor(theme);
  const entryColor = colors.entry || theme.borderColor;
  const takeProfitColor = colors.takeProfit || theme.successColor;
  const stopLossColor = colors.stopLoss || theme.borderColor;
  const liquidationColor = colors.liquidation || theme.errorColor;

  const lines: PositionLineConfig[] = [];

  if (position.currentPrice) {
    lines.push({
      price: position.currentPrice,
      color: currentPriceColor,
      lineStyle: 2,
      lineWidth: 1,
      showLabel: false,
      showPrice: false,
      horzLabelsAlign: 'right',
    });
  }
  if (position.entryPrice) {
    lines.push({
      price: position.entryPrice,
      text: 'Entry',
      color: entryColor,
      lineStyle: 2,
      lineWidth: 1,
      showLabel: true,
      showPrice: true,
      horzLabelsAlign: 'left',
    });
  }
  if (position.takeProfitPrice) {
    lines.push({
      price: position.takeProfitPrice,
      text: 'TP',
      color: takeProfitColor,
      lineStyle: 2,
      lineWidth: 1,
      showLabel: true,
      showPrice: true,
      horzLabelsAlign: 'left',
    });
  }
  if (position.stopLossPrice) {
    lines.push({
      price: position.stopLossPrice,
      text: 'SL',
      color: stopLossColor,
      lineStyle: 2,
      lineWidth: 1,
      showLabel: true,
      showPrice: true,
      horzLabelsAlign: 'left',
    });
  }
  if (position.liquidationPrice) {
    lines.push({
      price: position.liquidationPrice,
      text: 'Liq',
      color: liquidationColor,
      lineStyle: 2,
      lineWidth: 1,
      showLabel: true,
      showPrice: true,
      horzLabelsAlign: 'left',
    });
  }

  try {
    const chart = widget.activeChart();
    const gen = getGeneration();
    for (const line of lines) {
      chart
        .createShape(
          { price: line.price },
          {
            shape: 'horizontal_line',
            lock: true,
            disableSelection: true,
            disableSave: true,
            disableUndo: true,
            ...(line.text != null ? { text: line.text } : {}),
            overrides: {
              linecolor: line.color,
              linestyle: line.lineStyle,
              linewidth: line.lineWidth,
              showLabel: line.showLabel,
              textcolor: line.color,
              fontsize: 11,
              horzLabelsAlign: line.horzLabelsAlign,
              showPrice: line.showPrice,
            },
          },
        )
        .then((entityId) => {
          if (!entityId) return;
          if (getGeneration() !== gen) {
            try {
              chart.removeEntity(entityId);
            } catch {
              // Shape may already be gone
            }
            return;
          }
          pushPositionShapeId(entityId);
        })
        .catch(() => {
          // Shape creation can fail silently
        });
    }
  } catch (error) {
    reportErrorToRN(error);
  }
}

export function registerPositionLinesOverlay(): void {
  registerHandler('SET_POSITION_LINES', (payload) => {
    handleSetPositionLines(payload);
  });

  // resetData drops Drawing API shapes, so clear tracking on every OHLCV reset
  onDataLifecycle('ohlcvReset', () => {
    clearPositionShapeIds();
  });
}
