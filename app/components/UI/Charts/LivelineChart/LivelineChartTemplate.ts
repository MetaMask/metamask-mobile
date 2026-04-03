/**
 * Generates the self-contained HTML page that runs inside the LivelineChart
 * WebView.
 *
 * The page loads `liveline`, React, and ReactDOM from esm.sh via ES module
 * imports. On first load the browser fetches ~200KB; subsequent loads are
 * served from the browser cache (esm.sh pins versions with
 * `max-age=31536000, immutable`).
 *
 * The page listens for a single `SET_PROPS` postMessage from React Native,
 * rebuilds the props object, and calls `root.render(createElement(Liveline,
 * props))`. React's own reconciler handles all diffing.
 *
 * Callback props (`onHover`, `onWindowChange`, `onModeChange`,
 * `onSeriesToggle`) are wired inside the WebView and posted back to RN
 * via `ReactNativeWebView.postMessage`.
 */

const LIVELINE_VERSION = '0.0.7';
const REACT_VERSION = '18.3.1';

const ESM_BASE = 'https://esm.sh';
const REACT_URL = `${ESM_BASE}/react@${REACT_VERSION}`;
const REACT_DOM_CLIENT_URL = `${ESM_BASE}/react-dom@${REACT_VERSION}/client`;
const LIVELINE_URL = `${ESM_BASE}/liveline@${LIVELINE_VERSION}`;

export const createLivelineChartTemplate = (
  bgColor: string,
): string => `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:100%;height:100%;overflow:hidden;background:${bgColor}}
    #root{width:100%;height:100%}
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module">
    import { createElement } from '${REACT_URL}';
    import { createRoot } from '${REACT_DOM_CLIENT_URL}';
    import { Liveline } from '${LIVELINE_URL}';

    function sendToRN(type, payload) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({ type, payload: payload !== undefined ? payload : {} })
        );
      }
    }

    // Callbacks wired inside the WebView — they are functions so they cannot
    // cross the JSON bridge from RN. We create them here and attach them to
    // every render.
    const callbacks = {
      onHover: (point) => sendToRN('HOVER', point),
      onWindowChange: (secs) => sendToRN('WINDOW_CHANGE', { secs }),
      onModeChange: (mode) => sendToRN('MODE_CHANGE', { mode }),
      onSeriesToggle: (id, visible) => sendToRN('SERIES_TOGGLE', { id, visible }),
    };

    const root = createRoot(document.getElementById('root'));
    let currentProps = null;

    function render() {
      if (!currentProps) return;
      // Reconstruct formatValue / formatTime from their serialised bodies.
      const { formatValue, formatTime, ...rest } = currentProps;
      const props = {
        ...rest,
        ...callbacks,
        ...(formatValue ? { formatValue: new Function('v', formatValue) } : {}),
        ...(formatTime  ? { formatTime:  new Function('t', formatTime)  } : {}),
      };
      root.render(createElement(Liveline, props));
    }

    function handleMessage(event) {
      try {
        const msg = typeof event.data === 'string'
          ? JSON.parse(event.data)
          : event.data;
        if (msg.type === 'SET_PROPS') {
          currentProps = msg.payload;
          render();
        }
      } catch (e) {
        sendToRN('ERROR', { message: e.message });
      }
    }

    window.addEventListener('message', handleMessage);
    document.addEventListener('message', handleMessage);

    sendToRN('CHART_READY');
  </script>
</body>
</html>`;
