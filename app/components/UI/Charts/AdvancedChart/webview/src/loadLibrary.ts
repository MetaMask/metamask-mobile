/**
 * TradingView charting_library.js CDN loader.
 */

import { getState } from './state';
import { sendToReactNative } from './bridge';

/* eslint-disable @metamask/design-tokens/color-no-hex */

let libraryLoadAttempts = 0;
const maxLibraryLoadAttempts = 50;

export function resetLibraryLoadAttempts(): void {
  libraryLoadAttempts = 0;
}

export function getLibraryLoadAttempts(): number {
  return libraryLoadAttempts;
}

/**
 * Loads the TradingView charting library from CONFIG.libraryUrl.
 * Calls `initChart` when the library loads and data is available.
 */
export function loadLibrary(initChart: () => void): void {
  const s = getState();
  const scriptUrl = s.CONFIG.libraryUrl + 'charting_library.js';

  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = scriptUrl;
  script.onload = () => {
    s.libraryLoaded = true;
    if (s.ohlcvData.length > 0) {
      initChart();
    }
  };
  script.onerror = () => {
    s.libraryError = 'Failed to load TradingView library. URL: ' + scriptUrl;
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.innerHTML =
        '<div style="text-align:center;padding:20px;">' +
        '<p style="color:#FF6B6B;margin-bottom:10px;">Failed to load chart library</p>' +
        '<p style="font-size:12px;color:#888;">URL: ' +
        scriptUrl +
        '</p>' +
        '<p style="font-size:12px;color:#888;">Check S3 access or CORS configuration.</p>' +
        '</div>';
    }
    sendToReactNative('ERROR', { message: s.libraryError });
  };
  document.head.appendChild(script);
}
