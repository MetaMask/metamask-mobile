/**
 * Generates the self-contained HTML page that runs inside the LivelineChart
 * WebView.
 *
 * The page embeds React, ReactDOM, and liveline as inline <script> blocks —
 * no network requests are made at runtime.  This satisfies App Store
 * requirements that prohibit loading executable code from external URLs.
 *
 * JS assets are pre-built by `yarn build:liveline-webview` and committed to
 * the repo as string constants in LivelineChartAssets.ts.  To update:
 * 1. Bump `liveline` in devDependencies (package.json)
 * 2. Run `yarn build:liveline-webview`
 * 3. Commit the updated LivelineChartAssets.ts
 *
 * Load order
 * ----------
 * 1. react.production.min.js  → sets window.React
 * 2. react-dom.production.min.js → sets window.ReactDOM
 * 3. Inline shim → sets window.ReactJsxRuntime from window.React
 * (liveline's bundle was compiled with `react/jsx-runtime` externalized
 * to `ReactJsxRuntime`)
 * 4. liveline.iife.js → sets window.Liveline = { Liveline, … }
 * 5. Bridge script → wires postMessage ↔ root.render
 *
 * The page listens for a single `SET_PROPS` postMessage from React Native,
 * rebuilds the props object, and calls `root.render(createElement(Liveline,
 * props))`. React's own reconciler handles all diffing.
 *
 * Callback props (`onHover`, `onWindowChange`, `onModeChange`,
 * `onSeriesToggle`) are wired inside the WebView and posted back to RN
 * via `ReactNativeWebView.postMessage`.
 */

import { Theme } from '@metamask/design-tokens';

export const createLivelineChartTemplate = (
  theme: Theme,
  reactLib: string,
  reactDomLib: string,
  livelineLib: string,
): string => `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:100%;height:100%;overflow:hidden;background:${theme.colors.background.default}}
    #root{width:100%;height:100%;display:flex;flex-direction:column}
    /* The Liveline Fragment renders: optional showValue span, optional
       control-bar div, then the canvas-wrapper div. Only the canvas wrapper
       should grow to fill remaining space; preceding siblings take their
       natural height. Using last-child covers all combinations. */
    #root>*{flex-shrink:0}
    #root>*:last-child{flex:1;min-height:0}
  </style>
</head>
<body>
  <div id="root"></div>

  <!-- 1. React UMD — sets window.React -->
  <script>${reactLib}</script>

  <!-- 2. ReactDOM UMD — sets window.ReactDOM -->
  <script>${reactDomLib}</script>

  <!-- 3. react/jsx-runtime shim — liveline's bundle externalizes
       react/jsx-runtime to window.ReactJsxRuntime.
       The jsx/jsxs signatures differ from createElement:
         jsx(type, props, key?)  — children live inside props.children
         createElement(type, props, ...children) — children are variadic args
       We must extract children from props and pass key via the props object. -->
  <script>
    (function() {
      var createElement = window.React.createElement;
      function jsx(type, props, key) {
        var config = Object.assign({}, props);
        if (key !== undefined) { config.key = key; }
        var children = config.children;
        delete config.children;
        if (children === undefined) {
          return createElement(type, config);
        }
        if (Array.isArray(children)) {
          return createElement.apply(null, [type, config].concat(children));
        }
        return createElement(type, config, children);
      }
      window.ReactJsxRuntime = {
        jsx:      jsx,
        jsxs:     jsx,
        Fragment: window.React.Fragment,
      };
    })();
  </script>

  <!-- 4. liveline IIFE — sets window.Liveline = { Liveline, … } -->
  <script>${livelineLib}</script>

  <!-- 5. Bridge: RN ↔ WebView postMessage protocol -->
  <script>
    var createElement = window.React.createElement;
    var createRoot    = window.ReactDOM.createRoot;
    var Liveline      = window.Liveline.Liveline;

    function sendToRN(type, payload) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({ type: type, payload: payload !== undefined ? payload : {} })
        );
      }
    }

    // Callbacks wired inside the WebView — they are functions so they cannot
    // cross the JSON bridge from RN. We create them here and attach them to
    // every render.
    var callbacks = {
      onHover:        function(point)       { sendToRN('HOVER',         point); },
      onWindowChange: function(secs)        { sendToRN('WINDOW_CHANGE', { secs: secs }); },
      onModeChange:   function(mode)        { sendToRN('MODE_CHANGE',   { mode: mode }); },
      onSeriesToggle: function(id, visible) { sendToRN('SERIES_TOGGLE', { id: id, visible: visible }); },
    };

    var root = createRoot(document.getElementById('root'));
    var currentProps = null;
    var liveData = [];
    var liveValue = 0;
    var inLiveMode = false;
    var lastPerfTs = 0;

    function render() {
      if (!currentProps) return;
      var formatValue = currentProps.formatValue;
      var formatTime  = currentProps.formatTime;
      var rest = Object.assign({}, currentProps);
      delete rest.formatValue;
      delete rest.formatTime;
      var effectiveData  = inLiveMode ? liveData : (rest.data || []);
      var effectiveValue = inLiveMode ? liveValue : (rest.value || 0);
      var props = Object.assign({}, rest, callbacks, {
        style: { width: '100%' },
        data: effectiveData,
        value: effectiveValue,
      });
      if (formatValue) { props.formatValue = new Function('v', formatValue); }
      if (formatTime)  { props.formatTime  = new Function('t', formatTime);  }
      root.render(createElement(Liveline, props));
    }

    function handleMessage(event) {
      try {
        var msg = typeof event.data === 'string'
          ? JSON.parse(event.data)
          : event.data;
        switch (msg.type) {
          case 'SET_PROPS':
            if (inLiveMode) {
              var incoming = Object.assign({}, msg.payload);
              delete incoming.data;
              delete incoming.value;
              currentProps = Object.assign(currentProps || {}, incoming);
            } else {
              currentProps = msg.payload;
            }
            render();
            break;
          case 'APPEND_POINT':
            inLiveMode = true;
            liveData.push(msg.payload.point);
            liveValue = msg.payload.value;
            if (currentProps && currentProps.window) {
              var cutoff = msg.payload.point.time - currentProps.window * 2;
              while (liveData.length > 0 && liveData[0].time < cutoff) {
                liveData.shift();
              }
            }
            var t0 = performance.now();
            render();
            var t1 = performance.now();
            if (t1 - t0 > 16 && t1 - lastPerfTs > 5000) {
              lastPerfTs = t1;
              sendToRN('PERF', { renderMs: Math.round(t1 - t0), points: liveData.length });
            }
            break;
          case 'CLEAR_DATA':
            liveData = [];
            liveValue = 0;
            inLiveMode = false;
            render();
            break;
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
