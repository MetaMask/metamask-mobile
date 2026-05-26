/**
 * Communication bridge between the WebView and React Native.
 */

import { getState } from './state';
import type { WebViewToRNMessageType, TvDomPatchedWindow } from './types';

/**
 * Posts a typed message to React Native via `ReactNativeWebView.postMessage`.
 */
export function sendToReactNative(
  type: WebViewToRNMessageType,
  payload: Record<string, unknown> = {},
): void {
  const w = (typeof window !== 'undefined' ? window : undefined) as
    | TvDomPatchedWindow
    | undefined;
  if (w?.ReactNativeWebView) {
    w.ReactNativeWebView.postMessage(JSON.stringify({ type, payload }));
  }
}

export const LAYOUT_SETTLE_DATA_FALLBACK_MS = 400;

export function scheduleChartLayoutSettledNotify(): void {
  try {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const s = getState();
        if (s.chartWidget && s.isChartReady) {
          sendToReactNative('CHART_LAYOUT_SETTLED', {});
        }
      });
    });
  } catch {
    try {
      setTimeout(() => {
        const s = getState();
        if (s.chartWidget && s.isChartReady) {
          sendToReactNative('CHART_LAYOUT_SETTLED', {});
        }
      }, 48);
    } catch {
      // swallow
    }
  }
}

export function clearMmLayoutSettleFallbackTimer(): void {
  const s = getState();
  if (s.__mmLayoutSettleFallbackTimer != null) {
    clearTimeout(s.__mmLayoutSettleFallbackTimer);
    s.__mmLayoutSettleFallbackTimer = null;
  }
}

/**
 * Completes deferred layout settle: applies scale/line overrides then notifies RN.
 * Accepts optional callbacks so the caller wires in chartLayout/overlay logic
 * without creating a circular import.
 */
export function tryCompleteLayoutSettleAfterDataCore(
  onSettle?: () => void,
): void {
  const s = getState();
  if (!s.__mmLayoutSettlePending) return;
  s.__mmLayoutSettlePending = false;
  clearMmLayoutSettleFallbackTimer();
  try {
    if (onSettle) onSettle();
  } catch {
    // swallow
  }
  scheduleChartLayoutSettledNotify();
}

export function queueTryCompleteLayoutSettleAfterData(
  onSettle?: () => void,
): void {
  const s = getState();
  if (!s.__mmLayoutSettlePending) return;
  try {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        tryCompleteLayoutSettleAfterDataCore(onSettle);
      });
    });
  } catch {
    setTimeout(() => tryCompleteLayoutSettleAfterDataCore(onSettle), 32);
  }
}

export function beginDeferredLayoutSettleAfterOhlcvReload(): void {
  const s = getState();
  clearMmLayoutSettleFallbackTimer();
  s.__mmLayoutSettlePending = true;
  s.__mmLayoutSettleFallbackTimer = setTimeout(() => {
    s.__mmLayoutSettleFallbackTimer = null;
    if (s.__mmLayoutSettlePending) {
      tryCompleteLayoutSettleAfterDataCore();
    }
  }, LAYOUT_SETTLE_DATA_FALLBACK_MS);
}

export function abortDeferredLayoutSettleAndNotify(): void {
  const s = getState();
  s.__mmLayoutSettlePending = false;
  clearMmLayoutSettleFallbackTimer();
  scheduleChartLayoutSettledNotify();
}
