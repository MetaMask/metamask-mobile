# TradingView Advanced Charts Integration

## Purpose of This Document

This document serves as a comprehensive guide for the TradingView Advanced Charts integration in MetaMask Mobile. It covers:

1. **Local Development Setup** - How to test the integration locally while waiting for S3 access
2. **Comparison with Lightweight Charts** - Development effort, features, and trade-offs
3. **Technical Reference** - Architecture, API, and usage details

## Preview

<img width="356" height="736" alt="Screenshot 2026-02-04 at 09 58 08" src="https://github.com/user-attachments/assets/19fdf045-1714-4702-abf3-28f3f9ca5ee8" />


_TradingView Advanced Charts with drawing toolbar, candlestick chart, volume, and indicator toggles._

---

## Local Development Setup

### The Problem

The TradingView Advanced Charts library is deployed to AWS S3, but:

1. **S3 returns 403 AccessDenied** - Objects are not publicly readable
2. **WebView origin is `null`** - React Native WebViews loading inline HTML have an opaque origin, which some CORS configurations reject

### The Workaround: Local HTTP Server

While waiting for S3 access to be configured, we can test locally by running a simple HTTP server that serves the library files.

#### Step 1: Start Local Server

Navigate to the `terminal-s3` directory and start an HTTP server:

```bash
cd app/components/UI/AssetOverview/AdvancedChart/terminal-s3
npx http-server . -p 8000 --cors
```

This serves the TradingView library files at `http://localhost:8000/`.

#### Step 2: Update Template URL

In `AdvancedChartTemplate.ts`, the library URL is configured to use the local server:

```typescript
const CHARTING_LIBRARY_URL =
  'http://localhost:8000/charting_library/charting_library/';
```

When S3 access is fixed, change this back to:

```typescript
const CHARTING_LIBRARY_URL =
  'https://va-mmcx-terminal.s3.us-east-2.amazonaws.com/charting_library/charting_library/';
```

#### Step 3: Run the App

```bash
yarn watch:clean
yarn start:ios  # or yarn start:android
```

Navigate to any token's Asset page to see the Advanced Chart.

---

## Advanced Charts vs Lightweight Charts Comparison

### Quick Summary

| Aspect                            | Advanced Charts     | Lightweight Charts  |
| --------------------------------- | ------------------- | ------------------- |
| **Library Size**                  | ~24MB (1700+ files) | ~45KB (single file) |
| **Can Bundle Inline**             | No                  | Yes                 |
| **Built-in Indicators**           | 100+                | None                |
| **Drawing Tools**                 | 50+                 | None                |
| **Chart Type Toggle**             | 1 API call          | Manual series swap  |
| **Built-in UI (settings, menus)** | Yes                 | No                  |
| **License**                       | Commercial          | Apache 2.0          |

---

### Indicator Implementation Effort

#### MACD Indicator

| Metric                | Advanced Charts | Lightweight Charts |
| --------------------- | --------------- | ------------------ |
| **Lines of code**     | 4 lines         | ~80-100 lines      |
| **Math required**     | None            | EMA calculations   |
| **Time to implement** | 5 minutes       | 2-4 hours          |

**Advanced Charts:**

```javascript
case 'MACD':
  studyName = 'MACD';
  inputs = { in_0: 12, in_1: 26, in_2: 9 };
  break;
// Then: chart.createStudy(studyName, false, false, inputs);
```

**Lightweight Charts:** Requires manual EMA calculation, 3 separate series (MACD line, signal, histogram), pane management, and edge case handling.

#### RSI Indicator

| Metric                | Advanced Charts | Lightweight Charts  |
| --------------------- | --------------- | ------------------- |
| **Lines of code**     | 4 lines         | ~60-80 lines        |
| **Math required**     | None            | Gain/loss averaging |
| **Time to implement** | 5 minutes       | 1-2 hours           |

#### MA(200) Indicator

| Metric                | Advanced Charts | Lightweight Charts |
| --------------------- | --------------- | ------------------ |
| **Lines of code**     | 4 lines         | ~25-30 lines       |
| **Math required**     | None            | Simple average     |
| **Time to implement** | 2 minutes       | 30 minutes         |

#### Total for 3 Indicators (MACD, RSI, MA200)

| Metric                  | Advanced Charts | Lightweight Charts   |
| ----------------------- | --------------- | -------------------- |
| **Total lines of code** | ~15 lines       | ~200-250 lines       |
| **Development time**    | 15 minutes      | 4-8 hours            |
| **Unit tests needed**   | None            | Yes (accuracy tests) |

---

### Chart Type Toggle (Candlestick ↔ Line)

| Metric             | Advanced Charts | Lightweight Charts       |
| ------------------ | --------------- | ------------------------ |
| **Lines of code**  | ~82 lines total | ~50-60 lines (JS only)   |
| **API complexity** | 1 method call   | Remove + recreate series |
| **Data handling**  | Automatic       | Manual re-apply          |

**Advanced Charts:**

```javascript
chart.setChartType(1); // 1 = Candles, 2 = Line
```

**Lightweight Charts:**

```javascript
// Must remove old series, create new one, transform data, re-apply
chart.removeSeries(candlestickSeries);
lineSeries = chart.addSeries(LightweightCharts.LineSeries, {...});
const lineData = ohlcvData.map(bar => ({ time: bar.time, value: bar.close }));
lineSeries.setData(lineData);
```

---

### Drawing Tools (Trendlines, Fibonacci, etc.)

| Metric                    | Advanced Charts                         | Lightweight Charts   |
| ------------------------- | --------------------------------------- | -------------------- |
| **Available tools**       | 50+ built-in                            | None                 |
| **Implementation effort** | Config change                           | Weeks of development |
| **Includes**              | Trendlines, Fib, channels, shapes, text | N/A                  |

**Lightweight Charts has zero drawing tools.** Implementing even basic trendlines from scratch requires:

- Custom canvas rendering
- Touch/mouse event handlers
- Hit detection for selection
- Drag handles for editing
- Persistence/serialization
- Undo/redo system

**Estimated effort: 2-4 weeks for a basic set of 5 tools.**

#### Enabling Drawing Tools in Advanced Charts

**Option 1: Enable Built-in Toolbar (1 line change)**

The toolbar is disabled by default for a cleaner mobile UI. To enable it, remove `'left_toolbar'` from `disabled_features` in `chartLogic.js`:

```javascript
// In chartLogic.js
disabled_features: [
  'use_localstorage_for_settings',
  // 'left_toolbar',  // ← Remove/comment this line to enable drawing tools
  'header_widget',
  // ... other features
],

// Also remove hide_left_toolbar_by_default to show it immediately:
enabled_features: ['study_templates'],  // Remove 'hide_left_toolbar_by_default'
```

**Result:** Full drawing toolbar appears on the left side with 50+ tools.

**Option 2: Programmatic Tool Activation (Custom UI)**

Keep the toolbar hidden but activate tools via API when user taps custom buttons:

```javascript
// In chartLogic.js - add message handler
case 'ACTIVATE_DRAWING_TOOL':
  handleActivateDrawingTool(message.payload);
  break;

// Handler function
function handleActivateDrawingTool(payload) {
  if (!window.chartWidget || !window.isChartReady) return;

  var chart = window.chartWidget.activeChart();
  chart.selectLineTool(payload.tool);
  sendToReactNative('DRAWING_TOOL_ACTIVATED', { tool: payload.tool });
}

// To clear all drawings:
function handleClearDrawings() {
  var chart = window.chartWidget.activeChart();
  chart.removeAllShapes();
}
```

Then in React Native, create custom buttons:

```tsx
// Custom drawing tool buttons
<TouchableOpacity onPress={() => chartRef.current?.activateDrawingTool('trend_line')}>
  <Text>Trendline</Text>
</TouchableOpacity>

<TouchableOpacity onPress={() => chartRef.current?.activateDrawingTool('fib_retracement')}>
  <Text>Fibonacci</Text>
</TouchableOpacity>

<TouchableOpacity onPress={() => chartRef.current?.clearDrawings()}>
  <Text>Clear All</Text>
</TouchableOpacity>
```

**Available tool names:** `trend_line`, `horizontal_line`, `vertical_line`, `fib_retracement`, `rectangle`, `ellipse`, `arrow`, `text`, `pitchfork`, and many more.

**Comparison:**

| Approach         | Pros                                  | Cons                                            |
| ---------------- | ------------------------------------- | ----------------------------------------------- |
| Built-in toolbar | Zero code, all 50+ tools, undo/redo   | Takes screen space, TradingView's design        |
| Custom buttons   | Your UI, select which tools to expose | More code (~50 lines), limited to tools you add |

#### Enabling Context Menus (Delete Drawings)

To allow users to delete drawings via long-press:

```javascript
disabled_features: [
  // 'context_menus',  // ← Remove/comment to enable long-press menu
],
```

---

### Built-in UI Features

| Feature               | Advanced Charts         | Lightweight Charts    |
| --------------------- | ----------------------- | --------------------- |
| Settings dialog       | ✅ Built-in             | ❌ Build from scratch |
| Chart type switcher   | ✅ Built-in             | ❌ Manual             |
| Timeframe selector    | ✅ Built-in toolbar     | ❌ Manual             |
| Context menu          | ✅ Built-in             | ❌ None               |
| Drawing tools         | ✅ 50+ tools            | ❌ None               |
| Crosshair with values | ✅ Customizable         | ⚠️ Basic only         |
| Legend with OHLCV     | ✅ Built-in             | ❌ Manual             |
| Zoom controls         | ✅ Buttons + gestures   | ⚠️ Gestures only      |
| Screenshot/export     | ✅ Built-in             | ❌ Manual canvas      |
| Indicator settings    | ✅ Per-indicator dialog | ❌ Build custom UI    |

**Effort to replicate Advanced Charts UI in Lightweight Charts: 2-4 weeks**

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      React Native Layer                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│  │  AssetOverview   │──│  AdvancedChart   │──│IndicatorToggle │ │
│  └──────────────────┘  └────────┬─────────┘  └────────────────┘ │
│                                 │ postMessage                    │
└─────────────────────────────────┼───────────────────────────────┘
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                        WebView Layer                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│  │   HTML Template  │──│  TradingView     │──│ Custom         │ │
│  │                  │  │  Widget          │  │ Datafeed       │ │
│  └──────────────────┘  └──────────────────┘  └────────────────┘ │
│                                 │                                │
│                                 ▼ Load Script                    │
│              Local Server / AWS S3: charting_library.js          │
└─────────────────────────────────────────────────────────────────┘
```

## Files Overview

| File                          | Description                                                     |
| ----------------------------- | --------------------------------------------------------------- |
| `AdvancedChart.tsx`           | Main WebView component that renders the chart                   |
| `AdvancedChartTemplate.ts`    | HTML template with TradingView widget initialization            |
| `AdvancedChartDemo.tsx`       | Demo component with indicator toggles and chart type toggle     |
| `AdvancedChart.types.ts`      | TypeScript interfaces for OHLCV data, messages, and chart types |
| `AdvancedChart.styles.ts`     | Component styles                                                |
| `IndicatorToggle.tsx`         | Toggle buttons for indicators (MA, RSI, etc.)                   |
| `mockOHLCVData.ts`            | Mock OHLCV data generator for development                       |
| `webview/chartLogic.js`       | Core JavaScript for TradingView widget (editable)               |
| `webview/syncChartLogic.js`   | Sync script to update chartLogicString.ts                       |
| `webview/chartLogicString.ts` | Auto-generated JS string for embedding                          |
| `terminal-s3/`                | Local copy of TradingView library for testing                   |

---

## Usage

### Basic Usage

```tsx
import { AdvancedChart } from './AdvancedChart';

<AdvancedChart
  symbol="ETH/USD"
  ohlcvData={ohlcvData}
  height={400}
  onChartReady={() => console.log('Chart ready')}
/>;
```

### With Demo Component (Indicators + Chart Type Toggle)

```tsx
import AdvancedChartDemo from './AdvancedChartDemo';

<AdvancedChartDemo symbol="ETH/USD" height={540} />;
```

The demo component includes:

- Indicator toggle buttons (MA10, MA50, MA200, RSI)
- Chart type toggle (candlestick ↔ line)
- Mock OHLCV data

### Using the Chart Ref

```tsx
const chartRef = useRef<AdvancedChartRef>(null);

// Add indicator
chartRef.current?.addIndicator('MACD');

// Remove indicator
chartRef.current?.removeIndicator('MACD');

// Change chart type
chartRef.current?.setChartType(ChartType.Line);

// Reset chart
chartRef.current?.reset();
```

---

## OHLCV Data Format

```typescript
interface OHLCVBar {
  time: number; // Unix timestamp in milliseconds
  open: number; // Opening price
  high: number; // Highest price
  low: number; // Lowest price
  close: number; // Closing price
  volume: number; // Trading volume
}
```

---

## References

- [TradingView Charting Library Documentation](https://www.tradingview.com/charting-library-docs/)
- [React Native WebView](https://github.com/react-native-webview/react-native-webview)
- [Lightweight Charts](https://tradingview.github.io/lightweight-charts/)
