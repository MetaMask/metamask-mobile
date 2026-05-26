/**
 * TradingView indicator (study) add/remove handlers.
 */

import { getState } from './state';
import { sendToReactNative } from './bridge';

import type {
  TVEntityId,
  AddIndicatorPayload,
  RemoveIndicatorPayload,
} from './types';

export function isOwnStringKey(key: unknown): key is string {
  return (
    typeof key === 'string' &&
    key !== '__proto__' &&
    key !== 'constructor' &&
    key !== 'prototype'
  );
}

export interface IndicatorPreset {
  studyName: string;
  inputs: Record<string, unknown>;
}

/**
 * Resolves a preset indicator name to a TradingView study name + inputs.
 * Non-preset names are forwarded as-is.
 */
export function resolveIndicatorPreset(
  name: string,
  payloadInputs?: Record<string, unknown>,
): IndicatorPreset {
  switch (name) {
    case 'MACD':
      return { studyName: 'MACD', inputs: { in_0: 12, in_1: 26, in_2: 9 } };
    case 'RSI':
      return { studyName: 'Relative Strength Index', inputs: { in_0: 14 } };
    case 'MA200':
      return { studyName: 'Moving Average', inputs: { in_0: 200 } };
    default:
      return { studyName: name, inputs: payloadInputs || {} };
  }
}

export function handleAddIndicator(payload: AddIndicatorPayload): void {
  const s = getState();
  if (!s.chartWidget || !s.isChartReady) return;
  if (!payload || !payload.name) return;

  const indicatorName: string = payload.name;
  if (!isOwnStringKey(indicatorName)) return;
  if (s.activeStudies.has(indicatorName)) return;

  try {
    const chart = s.chartWidget.activeChart();
    const { studyName, inputs } = resolveIndicatorPreset(
      indicatorName,
      payload.inputs,
    );

    chart
      .createStudy(studyName, false, false, inputs)
      .then((studyId: TVEntityId) => {
        s.activeStudies.set(indicatorName, studyId);
        sendToReactNative('INDICATOR_ADDED', {
          name: indicatorName,
          id: String(studyId),
        });
      })
      .catch((error: Error) => {
        sendToReactNative('ERROR', {
          message: 'Failed to add indicator: ' + error.message,
        });
      });
  } catch (error: unknown) {
    sendToReactNative('ERROR', {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export function handleRemoveIndicator(payload: RemoveIndicatorPayload): void {
  const s = getState();
  if (!s.chartWidget || !s.isChartReady) return;
  if (!payload || !payload.name) return;

  const indicatorName: string = payload.name;
  if (!isOwnStringKey(indicatorName)) return;
  if (!s.activeStudies.has(indicatorName)) return;

  const studyId = s.activeStudies.get(indicatorName);
  if (!studyId) return;

  try {
    const chart = s.chartWidget.activeChart();
    chart.removeEntity(studyId);
    s.activeStudies.delete(indicatorName);
    sendToReactNative('INDICATOR_REMOVED', { name: indicatorName });
  } catch (error: unknown) {
    sendToReactNative('ERROR', {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
