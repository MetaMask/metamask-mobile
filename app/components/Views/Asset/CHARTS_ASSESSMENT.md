# Lightweight Charts Assessment for Token Details Revamp

## Technical Evaluation & Integration Feasibility

**Context:** Token Details Page Enhancement - Adding Candlestick Charts & Technical Indicators  
**Status:** Awaiting Approach Decision (Lightweight vs Advanced Charts)

---

## 🧪 Test Chart Available

A working test implementation is available at `TestLightweightChart.tsx` (using Lightweight Charts):

- Displays 200 candles with OHLCV data (5-min intervals)
- **Visible indicators**: VWAP (blue line), Bollinger Bands (purple dashed lines)
- **Calculated indicators**: RSI, MACD, Momentum (values shown in UI overlay panel)
- Integrated below AssetOverview in token details page for evaluation

---

## Executive Summary

This assessment evaluates using TradingView's Lightweight Charts for revamping the token details page to include candlestick charts, technical indicators, and chart type switching (line/candlestick). Analysis shows Lightweight Charts is **already proven in production** via the Perps feature, and all requested indicators can be implemented client-side (note: indicators are not built-in and need to be implemented manually).

### Key Findings

**Technical Feasibility:**

- ✅ All requested indicators CAN be calculated client-side from OHLCV data
- ✅ **API Platform team will provide OHLCV data** (confirmed)
- ✅ Chart type switching (line/candlestick) fully supported by both approaches
- ⚠️ **Multi-pane challenge:** RSI/MACD/Momentum need separate chart panes (different Y-axis scales)

**Available Solutions:**

- **Approach 1:** Lightweight Charts v5.0.8 (already in production via Perps)
  - Manual indicator calculation required
  - Smaller bundle (~195 KB)
  - Multi-pane needs workaround
- **Approach 2:** Advanced Charts (requires licensing)
  - 100+ built-in indicators
  - Native multi-pane support
  - Professional features
  - Larger bundle (~670 KB)

### Two Approaches

#### **Approach 1: Lightweight Charts + Manual Indicators**

**Characteristics:**

- ✅ Already in production (Perps feature)
- ✅ Reuse existing architecture and patterns
- ✅ Smaller bundle size (~195KB, estimated)
- ✅ No licensing costs or delays
- ⚠️ Manual indicator calculation required
- ⚠️ Multi-pane display requires workaround (multiple chart instances)

#### **Approach 2: Advanced Charts**

**Characteristics:**

- ✅ 100+ built-in technical indicators (RSI, MACD, all included)
- ✅ Native multi-pane support (automatic layout)
- ✅ Professional charting features out-of-the-box
- ✅ Drawing tools (70+ tools available)
- ✅ Better user experience for technical traders
- ⚠️ Larger bundle size (~670KB)
- ⚠️ Requires licensing evaluation (pending)
- ⚠️ New integration effort (no existing code to reuse)

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Requirements](#2-token-details-revamp-requirements)
3. [Technical Indicators Feasibility](#3-technical-indicators-client-side-feasibility)
   - 3.2 Indicators Analysis (Table with feasibility)
   - 3.3 Multi-Pane Requirement Explained
   - 3.4 JavaScript Library Options
4. [Integration Strategy](#4-lightweight-charts-integration-strategy)
5. [Approach Comparison](#5-approach-comparison)
6. [Recommended Approach](#6-recommended-approach)
7. [Risk Assessment](#7-risk-assessment--mitigation)
8. [Next Steps](#8-next-steps--decision-points)

---

## 1. Current State Analysis

### 1.1 Existing Perps Implementation

Lightweight Charts **v5.0.8** is currently deployed in the Perps feature using an **embedded bundle approach**:

**Implementation Files:**

```
📁 Perps Chart Implementation:
├── app/lib/lightweight-charts/LightweightChartsLib.ts
│   └── LIGHTWEIGHT_CHARTS_LIBRARY constant (embedded v5.0.8)
│   └── Size: ~304KB minified JavaScript string
│   └── Source: https://unpkg.com/lightweight-charts@5.0.8/
│
├── app/components/UI/Perps/components/TradingViewChart/
│   ├── TradingViewChart.tsx (610 lines)
│   │   └── WebView wrapper with React Native bridge
│   ├── TradingViewChartTemplate.tsx (1,624 lines)
│   │   └── HTML template that uses embedded library
│   └── Chart initialization and data management
│
└── app/components/UI/Perps/components/PerpsOHLCVBar/
    └── PerpsOHLCVBar.tsx (OHLC legend display)
```

**Key Characteristics:**

- ✅ Embedded library (no npm dependency, no CDN calls)
- ✅ WebView-based rendering
- ✅ Proven in production
- ✅ Theme integration working
- ✅ Real-time updates via WebSocket

### 1.2 Current Token Details Chart

**Location:** `app/components/UI/AssetOverview/PriceChart/PriceChart.tsx`

**Current Implementation:**

- **Library:** `react-native-svg-charts` with `AreaChart` component
- **Chart Type:** Line/Area chart only
- **Data Format:** Simple `[timestamp, price]` array pairs (no volume, no OHLC)
- **Features:**
  - Interactive tooltip with pan gesture
  - Time period selection (1H, 1D, 1W, 1M, 3M, 1Y, 3Y)
  - Stablecoin special handling (zoomed Y-axis)
  - Theme integration
- **Size:** Native SVG rendering (no WebView, no external library)

**Current Limitations:**

- ❌ No candlestick chart support
- ❌ No OHLCV data visualization
- ❌ No technical indicators
- ❌ No chart type switching

---

## 2. Token Details Revamp Requirements

### 2.1 Functional Requirements

**Design Reference:** [Figma - Assets Details v2](https://www.figma.com/proto/4r63CwcTMgG4r3bZ3jn1CV/Assets-details-v2?node-id=82-4544&m=dev&scaling=scale-down&content-scaling=fixed&page-id=0%3A1&starting-point-node-id=101%3A5332)

**Must Have:**

1. ✅ Candlestick chart visualization with OHLCV data
2. ✅ Line chart (maintain current functionality)
3. ✅ Chart type toggle: Line ↔ Candlestick
4. ✅ Five technical indicators:
   - Support & Resistance bands
   - VWAP (Volume Weighted Average Price)
   - Momentum
   - RSI (Relative Strength Index)
   - MACD (Moving Average Convergence Divergence)
5. ✅ Time period selection (existing functionality)
6. ✅ **Multiple indicators simultaneously** (per designs)
7. ✅ **Indicator configuration UI** - periods, colors (per designs)

**Nice to Have:**

- Indicator legends/overlays
- Export/share chart
- Advanced drawing tools

### 2.2 Data Requirements

✅ **API Platform team will provide OHLCV data** (confirmed)

**Data Format:**

```typescript
interface CandleData {
  time: number; // Unix timestamp
  open: number; // Opening price
  high: number; // Highest price in period
  low: number; // Lowest price in period
  close: number; // Closing price
  volume: number; // Trading volume (required for VWAP)
}
```

**Warm-up Data:** API should provide ~100 extra candles before the visible chart period for accurate RSI/MACD calculations.

---

## 3. Technical Indicators: Client-Side Feasibility

### 3.1 How Indicators Work with Lightweight Charts

**Important:** Lightweight Charts does NOT have built-in indicators. You must:

1. **Calculate** indicators using a separate library (e.g., `technicalindicators`)
2. **Render** the calculated values using Lightweight Charts series (LineSeries, HistogramSeries)
   - ✅ Works for ALL indicators (overlay and separate panes)
   - ⚠️ Multi-pane layout requires workaround (see section 3.3)

**Process Flow:**

```
OHLCV Data (from API)
    ↓
[Calculate with technicalindicators or custom functions]
    ↓
Indicator Values (arrays of numbers)
    ↓
[Render with Lightweight Charts LineSeries/HistogramSeries]
    ↓
Visual Chart with Indicators
```

### 3.2 Requested Indicators Analysis

| Indicator              | Input Data               | Feasible? | Complexity     | Warm-up Period                       |
| ---------------------- | ------------------------ | --------- | -------------- | ------------------------------------ |
| **VWAP**               | High, Low, Close, Volume | ✅ Yes    | ⭐ Low         | Session start required               |
| **Momentum**           | Close                    | ✅ Yes    | ⭐ Low         | N periods (e.g., 14)                 |
| **RSI**                | Close                    | ✅ Yes    | ⭐⭐ Medium    | ~100 candles for accuracy            |
| **MACD**               | Close                    | ✅ Yes    | ⭐⭐ Medium    | ~60-100 candles for EMA stability    |
| **Support/Resistance** | High, Low, Close         | ✅ Yes    | ⭐⭐⭐ Complex | Historical window (e.g., 50 candles) |

**Key Insights:**

- ✅ OHLCV data is 100% sufficient for all indicators
- ⚠️ Indicators require "warm-up" data before the visible chart period
- ⚠️ VWAP needs session-start data (not just "last N candles")
- ⚠️ RSI and MACD need ~60-100 candles before chart start for accuracy

---

### 3.3 Multi-Pane Requirement Explained

**Critical Limitation:** Some indicators cannot be displayed on the same chart as price data because they use different Y-axis scales.

#### Scale Compatibility:

| Indicator           | Scale Type              | Can Overlay on Price Chart? | Why?                                  |
| ------------------- | ----------------------- | --------------------------- | ------------------------------------- |
| **VWAP**            | Dollar values ($25-$35) | ✅ YES                      | Same units as price                   |
| **Bollinger Bands** | Dollar values ($25-$35) | ✅ YES                      | Same units as price                   |
| **Moving Averages** | Dollar values           | ✅ YES                      | Same units as price                   |
| **RSI**             | Percentage (0-100)      | ❌ NO                       | Different scale - needs separate pane |
| **MACD**            | Oscillator (-2 to +2)   | ❌ NO                       | Different scale - needs separate pane |
| **Momentum**        | Delta values (-5 to +5) | ❌ NO                       | Different scale - needs separate pane |

**Example:** If price chart shows $25-$35, where would RSI=65 go? It's 65%, not $65!

#### Lightweight Charts Limitation:

- ✅ **Single chart with left + right Y-axis** (works for price + volume)
- ❌ **Cannot create separate panes below** (no API for this)
- ⚠️ **Workaround:** Stack multiple chart instances manually (complex, needs sync)

#### Advanced Charts Solution:

- ✅ **Native multi-pane support** (automatic)
- ✅ **Built-in indicators** with proper panes (100+ indicators)
- ✅ **Professional implementation** (no manual work)
- ❌ **Larger bundle** (~670KB vs ~195KB)
- ❌ **Licensing required** (TBD)

#### Decision Impact:

**Option A:** MVP with overlay indicators only (VWAP + Bollinger Bands)

- ✅ Ship faster
- ✅ Proven with Lightweight Charts
- ⚠️ No RSI/MACD/Momentum graphs (could show values in text)

**Option B:** Full implementation with all indicators

- Need Advanced Charts OR multiple Lightweight Charts instances
- More development time
- Better user experience for technical traders

---

### 3.4 JavaScript Library Options (for Approach 1: Lightweight Charts)

**Note:** These libraries are only needed for **Approach 1 (Lightweight Charts)** which requires manual indicator calculation. **Approach 2 (Advanced Charts)** has 100+ indicators built-in.

#### **Option A: technicalindicators** (Recommended)

```bash
npm install technicalindicators
```

**Pros:**

- ✅ 2.4k GitHub stars, proven
- ✅ Supports ALL requested indicators
- ✅ TypeScript definitions
- ✅ Battle-tested in production
- **Bundle Size:** ~150KB

**Cons:**

- ⚠️ Last updated 6 years ago (mature but not actively maintained)

#### **Option B: ta-math**

```bash
npm install ta-math
```

**Pros:**

- ✅ Actively maintained
- ✅ Zero dependencies
- ✅ Smaller bundle (~80KB)
- ✅ Full TypeScript

**Cons:**

- ⚠️ Less battle-tested

#### **Option C: Manual Implementation**

**Pros:**

- ✅ Minimal bundle size
- ✅ Full control
- ✅ No external dependencies

**Cons:**

- ❌ High development effort
- ❌ Testing and validation burden
- ❌ Must handle warm-up periods correctly

**Recommendation:** Use **technicalindicators** for speed, or implement manually for full control.

---

## 4. Lightweight Charts Integration Strategy

### 4.1 Leveraging Existing Perps Architecture

**Proven Patterns to Reuse:**

- ✅ Embedded library bundle approach
- ✅ WebView-based rendering
- ✅ React Native bridge for data communication
- ✅ Theme integration
- ✅ Touch gesture handling
- ✅ Real-time updates pattern

**Reusable Components:**

- `app/lib/lightweight-charts/LightweightChartsLib.ts` (already exists)
- WebView bridge pattern from `TradingViewChart.tsx`
- Chart initialization boilerplate
- Theme color mapping

### 4.2 Data Warm-up Strategy

**Problem:** Indicators need historical data before the visible chart period.

**Solution:**

```typescript
// If user wants to view last 60 minutes
const visiblePeriod = 60; // minutes
const warmupPeriod = 100; // candles for RSI/MACD accuracy

// Fetch more data than displayed
const totalDataToFetch = visiblePeriod + warmupPeriod;

// Calculate indicators on full dataset
const indicators = calculateIndicators(fullDataset);

// Display only visible period on chart
const visibleData = fullDataset.slice(-visiblePeriod);
const visibleIndicators = indicators.slice(-visiblePeriod);
```

---

## 5. Approach Comparison

### 5.1 Feature Comparison

| Feature                     | Approach 1: Lightweight Charts       | Approach 2: Advanced Charts                 |
| --------------------------- | ------------------------------------ | ------------------------------------------- |
| **License**                 | ✅ Free (Apache 2.0)                 | 💰 Free with attribution or paid license    |
| **Bundle Size**             | ✅ ~195 KB                           | ⚠️ ~670 KB (3.4x larger)                    |
| **Built-in Indicators**     | ❌ None (manual calculation)         | ✅ 100+ built-in (RSI, MACD, all included)  |
| **Multi-Pane Support**      | ❌ No (workaround: multiple charts)  | ✅ Native multi-pane (automatic)            |
| **Drawing Tools**           | ❌ Limited                           | ✅ 70+ tools (trend lines, Fibonacci, etc.) |
| **Indicator Configuration** | ⚠️ Manual implementation             | ✅ Built-in UI for parameters               |
| **Chart Types**             | ✅ 7 types (Line, Candlestick, etc.) | ✅ 12+ types                                |
| **Current Status**          | ✅ In production (Perps)             | ❌ Not integrated                           |
| **Integration Effort**      | ⭐⭐ Medium (reuse Perps patterns)   | ⭐⭐⭐⭐ High (new integration)             |
| **User Experience**         | ⚠️ Basic charting                    | ✅ Professional trading platform            |
| **Maintenance**             | ✅ Open source community             | 💰 TradingView proprietary support          |

### 5.2 Bundle Size Impact

| Approach       | Components                                                  | Total Size  |
| -------------- | ----------------------------------------------------------- | ----------- |
| **Approach 1** | Lightweight Charts (~45 KB) + technicalindicators (~150 KB) | **~195 KB** |
| **Approach 2** | Advanced Charts                                             | **~670 KB** |

**Size Difference:** Advanced Charts is 3.4x larger, adding ~475 KB to bundle

### 5.3 When to Choose Each Approach

#### **Choose Approach 1 (Lightweight Charts) if:**

- ✅ Bundle size is critical constraint
- ✅ Want to ship faster (reuse existing code)
- ✅ Basic indicators sufficient (VWAP, Bollinger Bands overlay only)
- ✅ No licensing approval process desired
- ⚠️ Acceptable to show RSI/MACD/Momentum as text values (not graphs)

#### **Choose Approach 2 (Advanced Charts) if:**

- ✅ Want professional trading platform experience
- ✅ Need all indicators graphed with proper multi-pane layout
- ✅ Users expect TradingView-level features
- ✅ Drawing tools are valuable for users
- ✅ Bundle size increase acceptable (~475 KB)
- ⚠️ Can wait for licensing approval

---

## 6. Recommended Approach

Based on the [design requirements](https://www.figma.com/proto/4r63CwcTMgG4r3bZ3jn1CV/Assets-details-v2?node-id=82-4544), **Approach 2 (Advanced Charts) is more aligned with the product vision**.

### Why Advanced Charts is Recommended:

#### **Design Requirements Alignment:**

The Figma designs show requirements that Advanced Charts provides natively:

- ✅ **Multiple indicators simultaneously** - Built-in multi-pane support
- ✅ **Indicator configuration UI** - Native parameter controls (periods, colors, thresholds)
- ✅ **Professional charting experience** - 100+ technical indicators included
- ✅ **Drawing tools** - If needed in future phases

#### **Approach 1 (Lightweight Charts) Challenges:**

**1. External Library Dependency:**

- Must integrate `technicalindicators` or `ta-math` library
- Manual calculation for all 5 indicators (VWAP, RSI, MACD, Momentum, Support/Resistance)
- Additional testing and validation burden
- Maintenance of calculation accuracy

**2. Multi-Pane Workaround Required:**

- RSI, MACD, and Momentum need separate chart panes (different Y-axis scales)
- Lightweight Charts doesn't support multi-pane natively
- **Workaround:** Stack multiple chart instances manually
  - Complex implementation (synchronize zoom/pan between charts)
  - Higher memory usage (multiple WebView instances)
  - More maintenance complexity

**3. Configuration UI Implementation:**

- Must build custom indicator configuration UI from scratch
- Manage state for multiple indicator parameters
- Additional development and design effort

#### **Approach 2 (Advanced Charts) Advantages:**

- ✅ **All 5 indicators included** - No external libraries needed
- ✅ **Native multi-pane layout** - Automatic, no workarounds
- ✅ **Built-in configuration UI** - Parameter controls included
- ✅ **Professional UX** - Industry-standard charting experience
- ✅ **Future-proof** - 100+ indicators and drawing tools available

#### **Trade-offs:**

| Aspect                   | Approach 1 (Lightweight) | Approach 2 (Advanced)        |
| ------------------------ | ------------------------ | ---------------------------- |
| **Bundle Size**          | ~195 KB                  | ~670 KB (+475 KB)            |
| **Licensing**            | Free (Apache 2.0)        | Requires TradingView license |
| **Feature Completeness** | Basic (manual work)      | Professional (built-in)      |

---

## 7. Risk Assessment & Mitigation

### 7.1 Technical Risks

| Risk                         | Impact    | Probability | Mitigation                                                               |
| ---------------------------- | --------- | ----------- | ------------------------------------------------------------------------ |
| Insufficient warm-up data    | 🟡 Medium | Medium      | Fetch ~100 extra candles before visible period                           |
| VWAP session-start data      | 🟡 Medium | Medium      | Clarify session timing requirements with API team                        |
| Multi-pane display challenge | 🟡 Medium | Medium      | Use multiple chart instances or wait for Advanced Charts                 |
| WebView performance issues   | 🟡 Medium | Low         | Performance testing on low-end devices; lazy loading                     |
| Indicator calculation errors | 🟡 Medium | Low         | Use proven libraries (technicalindicators); validate with known datasets |
| Bundle size impacts app load | 🟡 Medium | Low         | Monitor app size; tree-shaking optimization                              |

---

## 8. Next Steps & Decision Points

### 8.1 Decision Gates

**Gate 1: Approach Selection** 🔴 **CRITICAL**

**Key Questions:**

- Are RSI/MACD/Momentum graphs (not just values) required?
- Is bundle size increase of ~475 KB acceptable?
- Can we wait for Advanced Charts licensing approval?

**Decision Matrix:**

| Requirement                  | Approach 1 (Lightweight) | Approach 2 (Advanced) |
| ---------------------------- | ------------------------ | --------------------- |
| All indicators as **graphs** | ⚠️ Complex workaround    | ✅ Native support     |
| Bundle size matters          | ✅ Small (~195 KB)       | ⚠️ Large (~670 KB)    |
| Professional features        | ❌ Limited               | ✅ Full suite         |
| Drawing tools                | ❌ No                    | ✅ 70+ tools          |

**Gate 2: Licensing Status** _(If Approach 2 chosen)_

- Advanced Charts licensing approved?
  - ✅ Yes → Begin integration
  - ❌ No → Pivot to Approach 1 or wait

**Gate 3: Proof of Concept**

- Build minimal candlestick + 1 indicator
- Validate performance on low-end Android
- Confirm warm-up data strategy works

**Gate 4: MVP Review**

- Line/Candlestick switching working
- Core indicators functional
- Performance acceptable

### 8.2 Open Questions

1. **🔴 CRITICAL: Approach Selection** - Lightweight Charts or Advanced Charts?
2. **Indicator Scope:** Are all 5 indicators P0, or can we ship with VWAP + Bollinger Bands first?
3. **Multi-Pane Requirement:** Must RSI/MACD/Momentum be graphed, or are text values acceptable?
4. **Default View:** Should line or candlestick be default?
5. **Time Periods:** Which periods are most important (1H, 1D, 1W, etc.)?
6. **Configuration Details:** Which indicator parameters should be configurable? (periods, colors, thresholds - per designs)
7. **Session Data:** How to handle VWAP session-start requirements with API?
8. **Bundle Size:** What's the acceptable app size increase threshold?

---

## 9. Resources

### 9.1 Documentation

**Design:**

- **Figma - Assets Details v2:** https://www.figma.com/proto/4r63CwcTMgG4r3bZ3jn1CV/Assets-details-v2?node-id=82-4544&m=dev&scaling=scale-down&content-scaling=fixed&page-id=0%3A1&starting-point-node-id=101%3A5332

**Technical:**

- **Lightweight Charts:** https://tradingview.github.io/lightweight-charts/
- **Advanced Charts:** https://www.tradingview.com/charting-library-docs/
- **technicalindicators:** https://github.com/anandanand84/technicalindicators
- **ta-math:** https://www.npmjs.com/package/ta-math

### 9.2 Current Implementation

**Perps (Reference):**

- `app/lib/lightweight-charts/LightweightChartsLib.ts`
- `app/components/UI/Perps/components/TradingViewChart/TradingViewChart.tsx`
- `app/components/UI/Perps/components/TradingViewChart/TradingViewChartTemplate.tsx`

**Current Token Details:**

- `app/components/UI/AssetOverview/PriceChart/PriceChart.tsx`

**Test Implementation:**

- `app/components/Views/Asset/TestLightweightChart.tsx`
- `app/components/Views/Asset/TEST_LIGHTWEIGHT_CHARTS_README.md`

### 9.3 Summary

#### Technical Feasibility: ✅ Confirmed

- ✅ **OHLCV data is sufficient** for all indicators (API team confirmed)
- ✅ **Warm-up data requirement** identified (60-100 candles before visible period)
- ✅ **VWAP session-start** requirement noted
- ✅ **RSI/MACD smoothing** ("memory") explained
- ✅ **Test implementation available** at `TestLightweightChart.tsx` for evaluation (using Lightweight Charts)

#### Two Viable Approaches:

**Approach 1: Lightweight Charts**

- ✅ Proven in production (Perps)
- ✅ Smaller bundle (~195 KB)
- ✅ Faster to ship (~8 weeks)
- ⚠️ Manual indicator implementation
- ⚠️ Multi-pane requires workaround

**Approach 2: Advanced Charts**

- ✅ 100+ built-in indicators
- ✅ Native multi-pane support
- ✅ Professional trading platform features
- ⚠️ Larger bundle (~670 KB)
- ⚠️ Licensing approval needed

**Note:** Advanced Charts/Trading Platform is better aligned with current [design requirements](https://www.figma.com/proto/4r63CwcTMgG4r3bZ3jn1CV/Assets-details-v2?node-id=82-4544).
