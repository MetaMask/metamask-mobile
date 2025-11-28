# Perps Screens & Views Documentation

Complete architectural reference for all 17 Perps screens in MetaMask Mobile.

## Table of Contents

1. [PerpsTabView](#perpstabview) - Main container
2. [PerpsHomeView](#perpshomeview) - Landing screen
3. [PerpsMarketListView](#perpsmarketlistview) - Market browser
4. [PerpsMarketDetailsView](#perpsmarketdetailsview) - Market detail
5. [PerpsOrderView](#perpsorderview) - Order entry
6. [PerpsPositionsView](#perpspositionsview) - Positions list
7. [PerpsClosePositionView](#perpsclosepositio nview) - Close position
8. [PerpsAdjustMarginView](#perpsadjustmarginview) - Adjust margin
9. [PerpsCloseAllPositionsView](#perpsclosealpositionsview) - Close all
10. [PerpsCancelAllOrdersView](#perpcancelallordersview) - Cancel all
11. [PerpsTPSLView](#perpstpslview) - TP/SL management
12. [PerpsTransactionsView](#perpstransactionsview) - Transaction history
13. [PerpsWithdrawView](#perpswithdrawview) - Withdrawal
14. [PerpsHeroCardView](#perpsherocardview) - Hero cards
15. [PerpsEmptyState](#perpsemptystate) - Empty states
16. [PerpsRedirect](#perpsredirect) - Routing logic
17. [HIP3DebugView](#hip3debugview) - Debug tools

---

## PerpsTabView

**Location:** `app/components/UI/Perps/Views/PerpsTabView/PerpsTabView.tsx`

### Purpose & User Journey

Main container view for Perps trading interface. Orchestrates all Perps screens within a tab-based structure. Acts as the root component when user selects Perps from main wallet tabs.

### Key Components Used

- `PerpsNavigation` - React Navigation stack navigator configuration
- Screen components (dynamically rendered based on active route)

### Hooks Consumed

- None directly (orchestration level)

### Data Flow

- Receives navigation props from parent (Wallet component)
- Routes all Perps navigation through React Navigation stack
- No Redux state mutations

### Navigation

- Entry point: User taps "Perps" tab in wallet
- Destinations: All other Perps screens (HomeView, MarketDetails, OrderView, etc.)
- Exit: User switches to different wallet tab

---

## PerpsHomeView

**Location:** `app/components/UI/Perps/Views/PerpsHomeView/PerpsHomeView.tsx`

### Purpose & User Journey

Landing screen for Perps trading. Displays aggregated trading overview including positions, open orders, watchlist markets, and recent activity. Single entry point to all trading actions.

### Key Components Used

| Component                    | Purpose                                 | Location                              |
| ---------------------------- | --------------------------------------- | ------------------------------------- |
| `PerpsMarketBalanceActions`  | Balance & deposit section               | `components/`                         |
| `PerpsCard`                  | Featured trading card                   | `components/`                         |
| `PerpsWatchlistMarkets`      | User watchlist                          | `components/PerpsWatchlistMarkets/`   |
| `PerpsMarketTypeSection`     | Market categories (Crypto/Stocks/Forex) | `components/`                         |
| `PerpsRecentActivityList`    | Recent trades & orders                  | `components/PerpsRecentActivityList/` |
| `PerpsHomeHeader`            | Header with balance display             | `components/`                         |
| `PerpsCloseAllPositionsView` | Modal: Close all positions              | `Views/PerpsCloseAllPositionsView/`   |
| `PerpsCancelAllOrdersView`   | Modal: Cancel all orders                | `Views/PerpsCancelAllOrdersView/`     |

### Hooks Consumed

| Hook                    | Purpose                                      |
| ----------------------- | -------------------------------------------- |
| `usePerpsHomeData`      | Fetches positions, orders, markets, activity |
| `usePerpsNavigation`    | Centralized navigation routing               |
| `usePerpsMeasurement`   | Performance tracking                         |
| `usePerpsEventTracking` | Analytics events                             |

### Data Flow

```
Redux + WebSocket (via usePerpsHomeData)
    ↓
Positions, Orders, Markets (real-time)
    ↓
PerpsHomeView renders sections
    ↓
User navigates to detail screens or executes close-all/cancel-all
```

### Navigation

- **From:** Perps tab selection from wallet
- **To:**
  - PerpsMarketDetailsView (tap market)
  - PerpsOrderView (new trade)
  - PerpsCloseAllPositionsView (modal)
  - PerpsCancelAllOrdersView (modal)
- **Analytics:** Tracks screen view with source (main button or deep link)

---

## PerpsMarketListView

**Location:** `app/components/UI/Perps/Views/PerpsMarketListView/PerpsMarketListView.tsx`

### Purpose & User Journey

Browsable market list with search, sorting, filtering by market type. User discovers new markets and filters by asset class (Crypto/Stocks/Commodities/Forex).

### Key Components Used

| Component                                    | Purpose                             |
| -------------------------------------------- | ----------------------------------- |
| `PerpsMarketList`                            | Virtualized market list (FlashList) |
| `PerpsMarketFiltersBar`                      | Asset type filter tabs              |
| `PerpsMarketSortFieldBottomSheet`            | Sort options modal                  |
| `PerpsStocksCommoditiesBottomSheet`          | Sub-filter for stocks/commodities   |
| `PerpsMarketListHeader`                      | Header with search                  |
| `PerpsMarketBalanceActions`                  | Balance section                     |
| `PerpsMarketListView.PerpsMarketRowSkeleton` | Loading skeleton                    |

### Hooks Consumed

| Hook                     | Purpose                                     |
| ------------------------ | ------------------------------------------- |
| `usePerpsMarketListView` | All market filtering, sorting, search logic |
| `usePerpsMeasurement`    | Performance tracking                        |
| `usePerpsEventTracking`  | Analytics                                   |
| `usePerpsNavigation`     | Navigation to market details                |

### Data Flow

```
usePerpsMarketListView hook:
  ├─ Fetches all markets
  ├─ Filters by: search, type (crypto/stocks/forex), favorites
  ├─ Sorts by: price change, volume, interest
  └─ Returns: filteredMarkets[], marketCounts

User interactions:
  ├─ Search → real-time filter
  ├─ Sort → reorder list
  ├─ Type filter → category filter
  └─ Tap market → navigate to PerpsMarketDetailsView
```

### Navigation

- **From:** PerpsHomeView, back buttons
- **To:** PerpsMarketDetailsView (tap market row)
- **Modal dialogs:** Sort/filter options

---

## PerpsMarketDetailsView

**Location:** `app/components/UI/Perps/Views/PerpsMarketDetailsView/PerpsMarketDetailsView.tsx`

### Purpose & User Journey

Detailed market view with TradingView chart, market stats, and trading interface. User analyzes price action and executes trades for a single market.

### Key Components Used

| Component                       | Purpose                            |
| ------------------------------- | ---------------------------------- |
| `PerpsMarketHeader`             | Title, price, 24h change           |
| `TradingViewChart`              | Chart with multiple timeframes     |
| `PerpsCandlePeriodSelector`     | Candle period (1m, 5m, 1h, 4h, 1d) |
| `PerpsMarketTabs`               | Info/Orders/Positions tabs         |
| `PerpsNavigationCard`           | Quick action buttons               |
| `PerpsOICapWarning`             | OI capacity warning                |
| `PerpsMarketHoursBanner`        | Trading hours status               |
| `PerpsMarketBalanceActions`     | Balance info                       |
| `PerpsFlipPositionConfirmSheet` | Flip position confirmation modal   |

### Hooks Consumed

| Hook                                        | Purpose                         |
| ------------------------------------------- | ------------------------------- |
| `usePerpsPositionData`                      | Fetch position for this market  |
| `usePerpsMarketStats`                       | Market statistics (funding, OI) |
| `useHasExistingPosition`                    | Check if user has position      |
| `usePerpsOICap`                             | OI cap checking                 |
| `usePerpsDataMonitor`                       | Data consistency monitoring     |
| `usePerpsMeasurement`                       | Performance tracking            |
| `usePerpsLiveOrders`, `usePerpsLiveAccount` | Real-time updates               |

### Data Flow

```
Route params: { market: PerpsMarketData }
    ↓
usePerpsMarketStats → Statistics
usePerpsPositionData → Existing position
usePerpsDataMonitor → Data consistency
    ↓
Render: Chart + Stats + Tabs
    ↓
User actions:
  ├─ Trade → PerpsOrderView
  ├─ Manage position → PerpsClosePositionView or PerpsTPSLView
  └─ View orders → Market orders tab
```

### Navigation

- **From:** PerpsMarketListView (tap market)
- **To:**
  - PerpsOrderView (new order button)
  - PerpsClosePositionView (close existing)
  - PerpsTPSLView (TP/SL settings)

---

## PerpsOrderView

**Location:** `app/components/UI/Perps/Views/PerpsOrderView/PerpsOrderView.tsx`

### Purpose & User Journey

Order placement interface. User specifies trade parameters: direction (long/short), amount (USD or size), leverage, and optional limit price. Final review before execution.

### Key Components Used

| Component                    | Purpose                            |
| ---------------------------- | ---------------------------------- |
| `PerpsOrderHeader`           | Market info (asset, price, change) |
| `PerpsAmountDisplay`         | USD amount display/input           |
| `PerpsSlider`                | Leverage/amount slider             |
| `PerpsFeesDisplay`           | Estimated fees breakdown           |
| `PerpsLimitPriceBottomSheet` | Limit price input modal            |

### Hooks Consumed

| Hook                    | Purpose               |
| ----------------------- | --------------------- |
| `usePerpsOrderForm`     | Form state management |
| `usePerpsOrderFees`     | Fee calculation       |
| `usePerpsRewards`       | Rewards & discounts   |
| `usePerpsValidation`    | Form validation       |
| `usePerpsLivePrices`    | Real-time price feed  |
| `usePerpsMeasurement`   | Performance tracking  |
| `usePerpsEventTracking` | Analytics             |

### Data Flow

```
Route params:
  ├─ market: PerpsMarketData
  ├─ orderType: 'market' | 'limit'
  └─ initialLeverage?: number

Form state:
  ├─ amount (USD)
  ├─ leverage
  ├─ orderType
  ├─ limitPrice (if limit order)
  └─ direction (long/short)

usePerpsOrderFees:
  ├─ Calculates trading fee
  ├─ Applies fee discount
  └─ Shows rewards

User action:
  ├─ Adjust amount → slider or keypad
  ├─ Set leverage → numeric input
  ├─ Set limit price → modal
  └─ Confirm → Execute order
```

### Navigation

- **From:** PerpsMarketDetailsView (Trade button)
- **To:** PerpsTPSLView (optional, after order placed)
- **Back:** Returns to market details

---

## PerpsPositionsView

**Location:** `app/components/UI/Perps/Views/PerpsPositionsView/PerpsPositionsView.tsx`

### Purpose & User Journey

List of all open positions. User views position details, total P&L, and can initiate close or TP/SL updates.

### Key Components Used

| Component           | Purpose                     |
| ------------------- | --------------------------- |
| `PerpsPositionCard` | Individual position card    |
| Utility functions   | PnL calculation, formatting |

### Hooks Consumed

| Hook                    | Purpose                       |
| ----------------------- | ----------------------------- |
| `usePerpsLivePositions` | Fetch all positions real-time |
| `usePerpsLiveAccount`   | Account state (margin, etc.)  |

### Data Flow

```
usePerpsLivePositions (WebSocket):
  └─ Returns: positions[], isInitialLoading

Calculate:
  ├─ Total unrealized P&L
  ├─ Total margin used
  └─ Position count

Render:
  ├─ Positions list
  ├─ Total P&L summary
  └─ Per-position action buttons
```

### Navigation

- **From:** Perps tab or PerpsHomeView
- **To:**
  - PerpsClosePositionView (close position)
  - PerpsTPSLView (set TP/SL)
  - PerpsMarketDetailsView (view market)

---

## PerpsClosePositionView

**Location:** `app/components/UI/Perps/Views/PerpsClosePositionView/PerpsClosePositionView.tsx`

### Purpose & User Journey

Interface to close existing position (fully or partially). User specifies close amount/percentage and optional limit price. Shows estimated fees and receive amount.

### Key Components Used

| Component                    | Purpose                          |
| ---------------------------- | -------------------------------- |
| `PerpsOrderHeader`           | Position info                    |
| `PerpsAmountDisplay`         | Close amount display             |
| `PerpsSlider`                | Close percentage slider          |
| `PerpsCloseSummary`          | Fee and receive amount breakdown |
| `PerpsLimitPriceBottomSheet` | Limit price for limit orders     |

### Hooks Consumed

| Hook                              | Purpose                  |
| --------------------------------- | ------------------------ |
| `usePerpsClosePosition`           | Close position execution |
| `usePerpsClosePositionValidation` | Validation logic         |
| `usePerpsOrderFees`               | Fee calculation          |
| `usePerpsRewards`                 | Rewards calculation      |
| `usePerpsLivePrices`              | Real-time prices         |
| `usePerpsMeasurement`             | Performance tracking     |

### Data Flow

```
Route params: { position: Position }

State:
  ├─ closePercentage (0-100)
  ├─ closeAmountUSD (for keypad input)
  ├─ orderType ('market' | 'limit')
  └─ limitPrice (optional)

Calculations:
  ├─ closeAmount = position.size * (closePercentage / 100)
  ├─ closingValue = positionValue * (closePercentage / 100)
  ├─ effectivePnL = calculated based on effective price
  └─ receiveAmount = margin + pnl - fees

User action: Confirm → handleClosePosition()
```

### Navigation

- **From:** PerpsPositionsView or PerpsMarketDetailsView
- **To:** PerpsMarketDetailsView (after close)
- **Modal:** Limit price bottom sheet

---

## PerpsCloseAllPositionsView

**Location:** `app/components/UI/Perps/Views/PerpsCloseAllPositionsView/PerpsCloseAllPositionsView.tsx`

### Purpose & User Journey

Modal/bottom sheet to close all open positions at once. Shows summary of total margin, P&L, and fees. Confirms user intent before mass execution.

### Key Components Used

| Component           | Purpose               |
| ------------------- | --------------------- |
| `BottomSheet`       | Modal container       |
| `PerpsCloseSummary` | Fee breakdown summary |

### Hooks Consumed

| Hook                           | Purpose                |
| ------------------------------ | ---------------------- |
| `usePerpsLivePositions`        | Fetch all positions    |
| `usePerpsLivePrice`            | Price data for calc    |
| `usePerpsCloseAllCalculations` | Aggregate calculations |
| `usePerpsCloseAllPositions`    | Execution hook         |
| `usePerpsToasts`               | Success/error feedback |
| `usePerpsEventTracking`        | Analytics              |

### Data Flow

```
Mount:
  ├─ Fetch positions
  ├─ Fetch prices
  └─ Calculate aggregates

Calculations (usePerpsCloseAllCalculations):
  ├─ totalMargin
  ├─ totalPnl
  ├─ totalFees
  ├─ feeDiscounts
  └─ rewards

User action: Confirm → usePerpsCloseAllPositions() → Loop through and close all
```

### Navigation

- **From:** PerpsHomeView (modal action) or navigation stack
- **To:** Back to PerpsHomeView (modal close)
- **Integration:** Can be embedded as external sheet ref or standalone route

---

## PerpsCancelAllOrdersView

**Location:** `app/components/UI/Perps/Views/PerpsCancelAllOrdersView/PerpsCancelAllOrdersView.tsx`

### Purpose & User Journey

Modal to cancel all pending orders at once. Shows list count and confirmation. Useful for clearing market without closing positions.

### Key Components Used

| Component     | Purpose         |
| ------------- | --------------- |
| `BottomSheet` | Modal container |

### Hooks Consumed

| Hook                      | Purpose                           |
| ------------------------- | --------------------------------- |
| `usePerpsLiveOrders`      | Fetch all orders (excludes TP/SL) |
| `usePerpsCancelAllOrders` | Execution hook                    |
| `usePerpsToasts`          | Feedback                          |
| `usePerpsEventTracking`   | Analytics                         |

### Data Flow

```
Mount:
  ├─ Fetch orders (hideTpSl: true)
  └─ Show count

User action: Confirm → Loop through and cancel all

Result:
  ├─ Show success toast
  ├─ Close modal
  └─ Refresh orders
```

### Navigation

- **From:** PerpsHomeView (modal action)
- **To:** Back to PerpsHomeView
- **Pattern:** Similar to PerpsCloseAllPositionsView

---

## PerpsTPSLView

**Location:** `app/components/UI/Perps/Views/PerpsTPSLView/PerpsTPSLView.tsx`

### Purpose & User Journey

Full-screen editor for Take Profit and Stop Loss price levels. Supports entry by price or percentage (ROE). Shows expected profit/loss. Used for new orders or position management.

### Key Components Used

| Component                                    | Purpose                  |
| -------------------------------------------- | ------------------------ |
| `Keypad`                                     | Numeric input for prices |
| Utility: `formatPerpsFiat`, `PRICE_RANGES_*` | Display formatting       |

### Hooks Consumed

| Hook                       | Purpose                     |
| -------------------------- | --------------------------- |
| `usePerpsTPSLForm`         | All form state & validation |
| `usePerpsLivePrices`       | Real-time market price      |
| `usePerpsLiquidationPrice` | Calculate liquidation level |
| `usePerpsEventTracking`    | Analytics                   |

### Data Flow

```
Route params:
  ├─ asset (market)
  ├─ direction (long/short)
  ├─ position (optional)
  ├─ leverage
  ├─ orderType ('market' | 'limit')
  └─ onConfirm callback

Form state (usePerpsTPSLForm):
  ├─ takeProfitPrice & percentage
  ├─ stopLossPrice & percentage
  ├─ validation errors
  └─ expected P&L

Pricing:
  ├─ Use live price if available
  ├─ Fall back to entry price for existing position
  └─ Use limit price for limit orders

User action: Confirm → onConfirm(tpPrice, slPrice, trackingData)
```

### Navigation

- **From:** PerpsOrderView or PerpsMarketDetailsView
- **To:** Previous screen (back navigation)
- **Full screen:** SafeAreaView-based navigation

---

## PerpsAdjustMarginView

**Location:** `app/components/UI/Perps/Views/PerpsAdjustMarginView/PerpsAdjustMarginView.tsx`

### Purpose & User Journey

Unified view for adjusting position margin (add or remove). Mode parameter determines behavior: add mode increases margin to reduce leverage; remove mode decreases margin to free collateral. Slider-based selection with live impact preview and risk warnings for remove mode.

### Key Components Used

| Component          | Purpose            |
| ------------------ | ------------------ |
| `Slider`           | Amount selector    |
| `PerpsOrderHeader` | Asset info & price |

### Hooks Consumed

| Hook                       | Purpose                               |
| -------------------------- | ------------------------------------- |
| `usePerpsMarginAdjustment` | Unified margin adjustment with toasts |
| `usePerpsLiveAccount`      | Available balance (add mode)          |
| `usePerpsMarkets`          | Max leverage (remove mode)            |
| `usePerpsLivePrices`       | Current market price                  |
| `usePerpsMeasurement`      | Performance tracking with mode tag    |

### Data Flow

```
Route params: { position, mode: 'add' | 'remove' }
Add mode: availableBalance → maxAmount
Remove mode: calculateMaxRemovableMargin() → maxAmount
User slides → Preview new margin/leverage/liq price
Remove mode: assessMarginRemovalRisk() → risk level (safe/warning/danger)
Confirm → handleAddMargin() or handleRemoveMargin()
```

### Navigation

- **From:** PerpsMarketDetailsView (position card → Adjust Margin action sheet → mode selection)
- **To:** Navigates back on success
- **Full screen:** SafeAreaView-based

---

## PerpsTransactionsView

**Location:** `app/components/UI/Perps/Views/PerpsTransactionsView/PerpsTransactionsView.tsx`

### Purpose & User Journey

Historical transaction log with filterable tabs: Trades, Orders, Funding, Deposits/Withdrawals. Pull-to-refresh supported. User reviews trading history.

### Key Components Used

| Component                   | Purpose                             |
| --------------------------- | ----------------------------------- |
| `FlashList`                 | Virtualized list (high performance) |
| `PerpsTransactionItem`      | Individual transaction card         |
| `PerpsTransactionsSkeleton` | Loading state                       |
| Tab buttons                 | Filter by transaction type          |

### Hooks Consumed

| Hook                         | Purpose                |
| ---------------------------- | ---------------------- |
| `usePerpsTransactionHistory` | Fetch all transactions |
| `usePerpsConnection`         | Connection state       |
| `usePerpsMeasurement`        | Performance tracking   |

### Data Flow

```
usePerpsTransactionHistory:
  └─ Fetch: trades, orders, funding, deposits/withdrawals

Grouping:
  ├─ Group by date
  └─ Flatten for FlashList

Filtering:
  ├─ User selects tab (Trades/Orders/Funding/Deposits)
  └─ Filter transactions by type

Navigation:
  ├─ Tap trade → PerpsPositionTransactionView
  ├─ Tap order → PerpsOrderTransactionView
  ├─ Tap funding → PerpsFundingTransactionView
  └─ Deposits show inline (no detail view)
```

### Navigation

- **From:** Perps tab or PerpsHomeView
- **To:** Transaction detail views (type-specific)
- **Pull-to-refresh:** Reloads all transaction data

---

## PerpsWithdrawView

**Location:** `app/components/UI/Perps/Views/PerpsWithdrawView/PerpsWithdrawView.tsx`

### Purpose & User Journey

Withdrawal flow to move USDC from Perps account back to mainchain wallet. User enters amount, sees fees, and confirms. Immediate navigation on confirm.

### Key Components Used

| Component                 | Purpose            |
| ------------------------- | ------------------ |
| `Keypad`                  | Numeric input      |
| `AvatarToken`             | USDC token display |
| `Badge`                   | Network badge      |
| `PerpsBottomSheetTooltip` | Info tooltips      |
| `KeyValueRow`             | Fee/time display   |

### Hooks Consumed

| Hook                    | Purpose                     |
| ----------------------- | --------------------------- |
| `usePerpsLiveAccount`   | Get available balance       |
| `usePerpsWithdrawQuote` | Fee calculation             |
| `useWithdrawValidation` | Validation (min/max)        |
| `useWithdrawTokens`     | Get destination token/chain |
| `usePerpsEventTracking` | Analytics                   |
| `usePerpsMeasurement`   | Performance                 |

### Data Flow

```
Mount:
  ├─ Fetch account balance
  ├─ Fetch destination token (USDC on Arbitrum)
  └─ Display available balance

User input:
  ├─ Enter amount via keypad
  ├─ Or tap 10/25/50/Max percentage
  └─ Validation: min $10, max available

Confirm:
  ├─ Call controller.withdraw()
  ├─ Navigate back immediately
  └─ Async execution with toast feedback

Result:
  ├─ Success/error toast
  └─ Balance update via WebSocket
```

### Navigation

- **From:** PerpsHomeView (deposit button)
- **To:** Back to PerpsHomeView (immediate)
- **Modal state:** Percentage buttons disappear when amount entered

---

## PerpsHeroCardView

**Location:** `app/components/UI/Perps/Views/PerpsHeroCardView/PerpsHeroCardView.tsx`

### Purpose & User Journey

Celebratory card carousel for profitable positions. User can swipe through 4 themed cards, customize with optional referral code, and share to social media.

### Key Components Used

| Component                | Purpose               |
| ------------------------ | --------------------- |
| `ScrollableTabView`      | Card carousel (swipe) |
| `react-native-view-shot` | Capture card image    |
| `react-native-share`     | Share to social apps  |
| `RewardsReferralCodeTag` | Referral code display |
| `PerpsTokenLogo`         | Market asset logo     |

### Hooks Consumed

| Hook                                 | Purpose                  |
| ------------------------------------ | ------------------------ |
| `usePerpsEventTracking`              | Share analytics          |
| `usePerpsToasts`                     | Share feedback           |
| Redux selector: `selectReferralCode` | Get user's referral code |

### Data Flow

```
Route params: { position: Position, marketPrice?: string }

Data used:
  ├─ position.unrealizedPnl (ROE calculation)
  ├─ position.leverage
  ├─ position.entryPrice
  ├─ marketPrice (for mark price display)
  └─ position.coin (asset symbol)

Carousel:
  ├─ 4 PNL character images
  ├─ Swipe to change
  └─ Dots indicator

Share:
  ├─ Capture current card as image
  ├─ Include referral code if available
  ├─ Send via Share sheet
  └─ Track success/failure
```

### Navigation

- **From:** PerpsHomeView (position share button)
- **To:** Share sheet or back to home
- **Analytics:** Track card view, share attempts

---

## PerpsEmptyState

**Location:** `app/components/UI/Perps/Views/PerpsEmptyState/PerpsEmptyState.tsx`

### Purpose & User Journey

Reusable empty state component shown when no positions exist. Encourages user to start trading.

### Key Components Used

| Component       | Purpose                   |
| --------------- | ------------------------- |
| `TabEmptyState` | Base empty state layout   |
| Image assets    | Theme-aware illustrations |

### Hooks Consumed

| Hook                | Purpose               |
| ------------------- | --------------------- |
| `useAssetFromTheme` | Theme-specific images |
| `useTailwind`       | Styling               |

### Data Flow

```
Props: { onActionPress?, testID? }

Render:
  ├─ Theme image (light/dark)
  ├─ "Start trading" message
  └─ CTA button (optional)

Action:
  └─ onActionPress() → Navigate to market list
```

### Navigation

- **From:** PerpsPositionsView or PerpsHomeView (when empty)
- **To:** PerpsMarketListView (action button)

---

## PerpsRedirect

**Location:** `app/components/UI/Perps/Views/PerpsRedirect.tsx`

### Purpose & User Journey

Initialization route that connects to Perps controller, initializes WebSocket, and redirects to home. User never sees this screen in normal flow (only during initialization).

### Key Components Used

| Component     | Purpose                       |
| ------------- | ----------------------------- |
| `PerpsLoader` | Full-screen loading indicator |

### Hooks Consumed

| Hook                 | Purpose                  |
| -------------------- | ------------------------ |
| `usePerpsConnection` | Monitor connection state |

### Data Flow

```
Mount:
  ├─ Check if connected & initialized
  ├─ If not: show loader
  └─ If yes: redirect to home

Redirect:
  ├─ Navigate to Routes.WALLET.HOME
  ├─ Wait for navigation complete (delay needed)
  ├─ setParams to select perps tab
  └─ Tab selection triggers PerpsTabView
```

### Navigation

- **From:** Deep link or initial Perps tab selection
- **To:** PerpsHomeView (or PerpsTabView container)
- **Status messages:** "Initializing Perps" → "Connecting" → redirect

---

## HIP3DebugView

**Location:** `app/components/UI/Perps/Debug/HIP3DebugView.tsx`

### Purpose & User Journey

Development-only debug interface for testing HyperLiquid HIP-3 multi-DEX feature. Tests DEX selection, market loading, transfers between DEXs, and order placement with auto-transfer.

### Key Components Used

| Component                                    | Purpose              |
| -------------------------------------------- | -------------------- |
| `DevLogger`                                  | Debug output console |
| Native UI: buttons, text, activity indicator | Basic controls       |

### Hooks Consumed

None directly (uses direct provider calls)

### Data Flow

```
Provider access:
  ├─ Engine.context.PerpsController.getActiveProvider()
  └─ Cast to HyperLiquidProvider

Test workflows:
  1. Load available DEXs
  2. Load markets for selected DEX
  3. Check account balances per DEX
  4. Manual transfer to/from DEX
  5. Test order with auto-transfer
  6. Test close with auto-transfer back

Output: DevLogger console (accessible via DevLogger UI)
```

### Features

| Feature               | Purpose                                         | Input                              |
| --------------------- | ----------------------------------------------- | ---------------------------------- |
| DEX Selector          | Choose which DEX to test                        | Dropdown from available HIP-3 DEXs |
| Market Selector       | Choose market on DEX                            | Dropdown filtered by selected DEX  |
| Balance Check         | View aggregated balances                        | Button (logs to console)           |
| Manual Transfer → DEX | Transfer $10 from main to selected DEX          | Button                             |
| Manual Transfer ← DEX | Transfer all from selected DEX back to main     | Button (reset)                     |
| Place Order           | $11 order with auto-transfer if needed          | Button                             |
| Close Position        | Close first position on DEX, auto-transfer back | Button                             |

### Navigation

- **From:** Developer menu or deep link (dev builds only)
- **To:** Only accessible in `__DEV__` mode
- **Visibility:** Returns "Debug tools unavailable" in production builds

---

## Transaction Detail Views

Also included in PerpsTransactionsView folder (referenced from main transactions view):

### PerpsFundingTransactionView

Shows detailed funding rate transaction with cumulative funding data.

### PerpsOrderTransactionView

Shows order details: status (pending/filled/canceled), price, size, fees.

### PerpsPositionTransactionView

Shows position trade details: entry price, P&L realized, fees paid.

---

## Architecture Summary

### Data Layer

All views consume real-time data via:

1. **WebSocket streams** (via hooks):
   - `usePerpsLivePrices` - Price updates
   - `usePerpsLivePositions` - Position updates
   - `usePerpsLiveOrders` - Order updates
   - `usePerpsLiveAccount` - Balance updates

2. **Controller methods** (async):
   - `usePerpsOrderFees` - Fee calculations
   - `usePerpsMarketData` - Market metadata
   - `usePerpsTransactionHistory` - Historical data

3. **Redux** (selectors):
   - User preferences
   - Cached state
   - Referral code

### Navigation Pattern

```
Wallet Tab (PerpsTabView)
  ↓
PerpsHomeView (entry point)
  ├→ PerpsMarketListView (browse)
  │  └→ PerpsMarketDetailsView (view market)
  │     ├→ PerpsOrderView (trade)
  │     └→ PerpsClosePositionView (close)
  ├→ PerpsPositionsView (manage)
  │  ├→ PerpsClosePositionView
  │  └→ PerpsTPSLView (TP/SL)
  ├→ PerpsTransactionsView (history)
  │  └→ Detail views (trade/order/funding)
  ├→ PerpsWithdrawView (withdraw)
  └→ PerpsHeroCardView (share card)
```

### Performance Patterns

- **Throttled prices:** 1000ms for close position, 500ms for TP/SL
- **Virtualized lists:** FlashList in PerpsTransactionsView
- **Lazy loading:** Markets load on demand in market list
- **Performance tracking:** usePerpsMeasurement hook tracks screen load times

### State Management

- **Ephemeral:** Form inputs, UI state (focused input, etc.)
- **Cached:** Market data, transaction history
- **Real-time:** Prices, positions, orders, balances
- **Persisted:** User preferences (chart candle period, etc.)
