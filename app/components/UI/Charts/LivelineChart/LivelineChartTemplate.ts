import type { Theme } from '../../../../util/theme/models';
import livelineBundle from './liveline-bundle';

/**
 * Subset of LivelineOptions that are baked into the initial HTML template.
 * Props that change frequently (data, candles, liveCandle, hiddenSeriesIds)
 * are sent via postMessage after mount and are NOT included here.
 */
interface LivelineTemplateOptions {
  // Appearance
  theme: 'light' | 'dark';
  color?: string;
  lineWidth?: number;

  // Feature flags
  grid?: boolean;
  badge?: boolean;
  badgeTail?: boolean;
  badgeVariant?: string;
  momentum?: boolean | string;
  fill?: boolean;
  scrub?: boolean;
  exaggerate?: boolean;
  showValue?: boolean;
  valueMomentumColor?: boolean;
  degen?: boolean | { scale?: number; downMomentum?: boolean };
  pulse?: boolean;

  // Time window
  window?: number;

  // Crosshair
  tooltipY?: number;
  tooltipOutline?: boolean;

  // Reference line
  referenceLine?: { value: number; label?: string };

  // Orderbook
  orderbook?: { bids: [number, number][]; asks: [number, number][] };

  /**
   * Serialised JS function body for value formatting.
   * Will be called as: new Function('v', formatValue)(v)
   * Example: "return v.toFixed(2) + '%'"
   */
  formatValue?: string;

  /**
   * Serialised JS function body for time formatting.
   * Will be called as: new Function('t', formatTime)(t)
   * Example: "var d = new Date(t*1000); return d.toLocaleTimeString()"
   */
  formatTime?: string;

  // Layout / animation
  padding?: { top?: number; right?: number; bottom?: number; left?: number };
  lerpSpeed?: number;

  // Candlestick mode
  mode?: 'line' | 'candle';
  candleWidth?: number;
}

export const createLivelineChartTemplate = (
  appTheme: Theme,
  options: LivelineTemplateOptions = { theme: 'dark' },
): string => {
  const bgColor = appTheme.colors.background.default;

  // Separate formatValue/formatTime from the rest — they need special handling
  const { formatValue, formatTime, ...serializableOptions } = options;
  const initialConfig = JSON.stringify(serializableOptions);

  // Build function source strings to be eval'd in the WebView.
  // Fall back to sensible defaults if not provided.
  const formatValueSrc =
    formatValue ?? "return v < 1 ? v.toFixed(1) + '%' : Math.round(v) + '%'";
  const formatTimeSrc =
    formatTime ??
    "var d = new Date(t * 1000); var h = String(d.getHours()).padStart(2,'0'); var m = String(d.getMinutes()).padStart(2,'0'); var s = String(d.getSeconds()).padStart(2,'0'); return h + ':' + m + ':' + s";

  return `<!DOCTYPE html>
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
  <script>${livelineBundle}</script>
  <script>
    var chart = null;
    var currentProps = ${initialConfig};
    var currentData = [];
    var currentValue = 0;
    var currentSeries = null;
    var currentCandles = null;
    var currentLiveCandle = null;
    var currentLineData = null;
    var currentLineValue = null;
    var currentHiddenSeriesIds = null;

    function sendToRN(type, payload) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({type, payload: payload !== undefined ? payload : {}}));
      }
    }

    var formatValue = new Function('v', ${JSON.stringify(formatValueSrc)});
    var formatTime = new Function('t', ${JSON.stringify(formatTimeSrc)});

    function buildOptions() {
      var opts = Object.assign({}, currentProps, {
        data: currentData,
        value: currentValue,
        formatValue: formatValue,
        formatTime: formatTime,
      });
      if (currentSeries) opts.series = currentSeries;
      if (currentCandles) opts.candles = currentCandles;
      if (currentLiveCandle !== null) opts.liveCandle = currentLiveCandle;
      if (currentLineData !== null) opts.lineData = currentLineData;
      if (currentLineValue !== null) opts.lineValue = currentLineValue;
      if (currentHiddenSeriesIds !== null) {
        opts.hiddenSeriesIds = new Set(currentHiddenSeriesIds);
      }
      return opts;
    }

    function handleMessage(event) {
      try {
        var msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        switch (msg.type) {
          case 'SET_DATA':
            currentData = msg.payload.data;
            currentValue = msg.payload.value;
            if (chart) chart.update(buildOptions());
            break;
          case 'UPDATE_VALUE': {
            var pt = {time: msg.payload.time, value: msg.payload.value};
            currentData = currentData.concat([pt]);
            currentValue = msg.payload.value;
            if (chart) chart.update(buildOptions());
            break;
          }
          case 'SET_SERIES':
            currentSeries = msg.payload.series;
            if (chart) chart.update(buildOptions());
            break;
          case 'SET_PROPS': {
            var p = msg.payload;
            // Handle props that need local variable updates
            if (p.candles !== undefined) currentCandles = p.candles;
            if (p.liveCandle !== undefined) currentLiveCandle = p.liveCandle;
            if (p.lineData !== undefined) currentLineData = p.lineData;
            if (p.lineValue !== undefined) currentLineValue = p.lineValue;
            if (p.hiddenSeriesIds !== undefined) currentHiddenSeriesIds = p.hiddenSeriesIds;
            // Remaining props merge into currentProps
            var remainder = Object.assign({}, p);
            delete remainder.candles;
            delete remainder.liveCandle;
            delete remainder.lineData;
            delete remainder.lineValue;
            delete remainder.hiddenSeriesIds;
            currentProps = Object.assign({}, currentProps, remainder);
            if (chart) chart.update(buildOptions());
            break;
          }
        }
      } catch(e) {
        sendToRN('ERROR', {message: e.message});
      }
    }

    window.addEventListener('message', handleMessage);
    document.addEventListener('message', handleMessage);

    chart = window.Liveline.createLiveline(
      document.getElementById('root'),
      buildOptions()
    );

    sendToRN('CHART_READY');
  </script>
</body>
</html>`;
};
