/**
 * Perps-style dashed horizontal position lines (entry, TP, SL, liquidation).
 */

import { getState } from './state';
import { sendToReactNative } from './bridge';

import type { TVEntityId, SetPositionLinesPayload } from './types';

/* eslint-disable @metamask/design-tokens/color-no-hex */

export function clearPositionLines(): void {
  const s = getState();
  if (!s.chartWidget || !s.isChartReady) return;

  try {
    const chart = s.chartWidget.activeChart();
    for (const shapeId of s.positionShapeIds) {
      try {
        chart.removeEntity(shapeId);
      } catch {
        // already removed
      }
    }
    s.positionShapeIds = [];
  } catch (error: unknown) {
    sendToReactNative('ERROR', {
      message:
        'Failed to clear position lines: ' +
        (error instanceof Error ? error.message : String(error)),
    });
  }
}

interface LineSpec {
  price: number;
  text: string;
  color: string;
  lineStyle: number;
}

export function handleSetPositionLines(payload: SetPositionLinesPayload): void {
  const s = getState();
  if (!s.chartWidget || !s.isChartReady) return;

  clearPositionLines();

  if (!payload || !payload.position) return;

  const position = payload.position;
  const theme = s.CONFIG.theme;

  try {
    const chart = s.chartWidget.activeChart();
    const lines: LineSpec[] = [];

    if (position.entryPrice) {
      lines.push({
        price: position.entryPrice,
        text: 'Entry',
        color: '#858585',
        lineStyle: 2,
      });
    }
    if (position.takeProfitPrice) {
      lines.push({
        price: position.takeProfitPrice,
        text: 'TP',
        color: theme.successColor,
        lineStyle: 2,
      });
    }
    if (position.stopLossPrice) {
      lines.push({
        price: position.stopLossPrice,
        text: 'SL',
        color: '#858585',
        lineStyle: 2,
      });
    }
    if (position.liquidationPrice) {
      lines.push({
        price: position.liquidationPrice,
        text: 'Liq',
        color: theme.errorColor,
        lineStyle: 2,
      });
    }

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
            text: line.text,
            overrides: {
              linecolor: line.color,
              linestyle: line.lineStyle,
              linewidth: 1,
              showLabel: true,
              textcolor: line.color,
              fontsize: 11,
              horzLabelsAlign: 'right',
              showPrice: true,
            },
          },
        )
        .then((entityId: TVEntityId) => {
          if (entityId) {
            s.positionShapeIds.push(entityId);
          }
        })
        .catch(() => {
          /* noop */
        });
    }
  } catch (error: unknown) {
    sendToReactNative('ERROR', {
      message:
        'Failed to add position lines: ' +
        (error instanceof Error ? error.message : String(error)),
    });
  }
}
