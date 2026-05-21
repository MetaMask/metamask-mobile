/**
 * Inbound message dispatcher — routes RN postMessage events to handlers.
 */

import { getState } from './state';
import { sendToReactNative } from './bridge';
import { handleSetOHLCVData, handleRealtimeUpdate } from './ohlcvData';
import { handleAddIndicator, handleRemoveIndicator } from './indicators';
import { handleSetChartType } from './chartType';
import { handleSetLineChrome } from './handleSetLineChrome';
import { handleSetPositionLines } from './positionLines';
import { handleToggleVolume } from './volume';
import type {
  RNMessage,
  SetOHLCVDataPayload,
  AddIndicatorPayload,
  RemoveIndicatorPayload,
  SetChartTypePayload,
  SetPositionLinesPayload,
  RealtimeUpdatePayload,
  ToggleVolumePayload,
} from './types';

// eslint-disable-next-line no-empty-function
let _initChart: () => void = () => {};

/** Must be called once at bootstrap so handleSetOHLCVData can trigger chart init. */
export function setInitChartRef(fn: () => void): void {
  _initChart = fn;
}

export function handleMessage(event: MessageEvent | { data: unknown }): void {
  try {
    const message: RNMessage =
      typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
    const s = getState();

    if (!s.isChartReady && message.type !== 'SET_OHLCV_DATA') {
      s.pendingMessages.push(message);
      return;
    }

    switch (message.type) {
      case 'SET_OHLCV_DATA':
        handleSetOHLCVData(message.payload as SetOHLCVDataPayload, _initChart);
        break;
      case 'ADD_INDICATOR':
        handleAddIndicator(message.payload as AddIndicatorPayload);
        break;
      case 'REMOVE_INDICATOR':
        handleRemoveIndicator(message.payload as RemoveIndicatorPayload);
        break;
      case 'SET_CHART_TYPE':
        handleSetChartType(message.payload as SetChartTypePayload);
        break;
      case 'SET_LINE_CHROME':
        handleSetLineChrome(message.payload);
        break;
      case 'SET_POSITION_LINES':
        handleSetPositionLines(message.payload as SetPositionLinesPayload);
        break;
      case 'REALTIME_UPDATE':
        handleRealtimeUpdate(message.payload as RealtimeUpdatePayload);
        break;
      case 'TOGGLE_VOLUME':
        handleToggleVolume(message.payload as ToggleVolumePayload);
        break;
    }
  } catch (error: unknown) {
    sendToReactNative('ERROR', {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export function registerMessageListeners(): void {
  window.addEventListener('message', handleMessage as EventListener);
  document.addEventListener('message', handleMessage as EventListener);
}
