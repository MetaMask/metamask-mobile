## **Description**

This PR implements four major improvements to the Perps trading interface, delivered as a cohesive enhancement to the user experience:

### 1. **Perps Home Screen v2** (TAT-1538)

Replaced the previous market-only list view with a comprehensive trading dashboard that provides an at-a-glance overview of all relevant perps information:

- **Positions Carousel**: Horizontal scrollable list of open positions with quick access to position details
- **Orders Carousel**: Horizontal scrollable list of open limit orders with quick navigation
- **Trending Markets List**: Top 5 markets by 24h trading volume with "See all" navigation
- **Recent Activity List**: Last 3 trade executions with "See All" link to full activity tab
- **Learn More Component**: Educational component for new users (moved from individual market pages)

### 2. **Market Sorting & Filtering** (TAT-1539)

Added comprehensive market sorting capabilities accessible via the "See all" button from trending markets:

- **Sort Fields**: Volume, Price Change, Market Cap, Funding Rate, New Markets
- **Sort Direction**: Toggle between ascending/descending for each field
- **Search**: Real-time market search by symbol/name
- **Filter Chips**: Visual sort field selection using familiar chip pattern (similar to TP/SL presets)
- **Bottom Sheets**: Native iOS/Android bottom sheet selectors for sort field and direction

### 3. **Close All Positions** (TAT-1049)

Implemented batch position closing to streamline portfolio management:

- **Close All Button**: Visible on home screen when user has ≥2 open positions
- **Summary Bottom Sheet**: Displays aggregated margin, P&L, fees, and receive amount before confirmation
- **Shared Summary Component**: Extracted `PerpsCloseSummary` component used across single position close, close all modal, and close all view (eliminated 138 lines of duplicate JSX)
- **Batch Controller Method**: New `closePositions()` method in PerpsController with parallel execution and partial success handling
- **Enhanced Fee Hook**: Updated `usePerpsOrderFees` to accept single OR array params with automatic aggregation

### 4. **Cancel All Orders** (TAT-1815)

Implemented batch order cancellation following the same UX pattern as Close All Positions:

- **Cancel All Button**: Visible when user has multiple open orders
- **Confirmation Modal**: Simple confirmation dialog with order count
- **Batch Controller Method**: New `cancelOrders()` method in PerpsController with parallel execution
- **Consistent UX**: Follows same bottom sheet and confirmation pattern as Close All Positions

### Technical Improvements

- **No Breaking Changes**: Maintained all existing routes and component APIs
- **Component Reusability**: Shared `PerpsCloseSummary` eliminates code duplication across 3 close position UIs
- **Performance**: Parallel execution for batch operations with partial success handling
- **Type Safety**: Complete TypeScript types for all new hooks, components, and controller methods
- **Consistent Patterns**: All hooks use object parameter pattern for extensibility

## **Changelog**

CHANGELOG entry: Added Perps home screen with positions/orders carousels, trending markets list, recent activity, market sorting/filtering, and batch close all positions/cancel all orders functionality

## **Related issues**

Fixes: https://consensyssoftware.atlassian.net/browse/TAT-1538
Fixes: https://consensyssoftware.atlassian.net/browse/TAT-1539
Fixes: https://consensyssoftware.atlassian.net/browse/TAT-1049
Fixes: https://consensyssoftware.atlassian.net/browse/TAT-1815

## **Manual testing steps**

```gherkin
Feature: Perps Home Screen v2

  Scenario: User views new home screen layout
    Given user is on Perps tab
    And user has at least 1 open position
    And user has at least 1 open order

    When user navigates to Perps home screen
    Then user sees positions carousel with position cards
    And user sees orders carousel with order cards
    And user sees trending markets list with top 5 markets
    And user sees recent activity list with last 3 trades
    And user sees "Learn more about perps" component

  Scenario: User navigates from home carousels
    Given user is on Perps home screen
    And positions carousel shows 3 positions
    And orders carousel shows 2 orders
    And trending markets shows 5 markets

    When user taps "View all" on positions carousel
    Then user is redirected to full positions list

    When user taps "View all" on orders carousel
    Then user is redirected to transactions view

    When user taps "See all" on trending markets
    Then user is redirected to market list view with sorting options

  Scenario: User sorts markets by different criteria
    Given user is on market list view (from "See all")
    And markets are displayed with default sort (Volume, descending)

    When user taps sort field dropdown
    Then user sees bottom sheet with options: Volume, Price Change, Market Cap, Funding Rate, New Markets

    When user selects "Price Change"
    And user taps sort direction toggle
    Then markets are sorted by price change in ascending order
    And sort chips reflect current selection

  Scenario: User searches for specific market
    Given user is on market list view
    And user sees search bar at top

    When user types "BTC" in search bar
    Then market list filters to show only BTC-related markets
    And search continues to work with active sort settings

  Scenario: User closes all positions at once
    Given user is on Perps home screen
    And user has 3 open positions
    And "Close All" button is visible

    When user taps "Close All" button
    Then bottom sheet appears showing:
      - Total margin (sum of all positions)
      - Total unrealized P&L (aggregated)
      - Total fees (closing fees for all positions)
      - Amount user will receive (margin + P&L - fees)
      - Estimated points (if rewards enabled)
      - Fee discount indicator (if applicable)

    When user taps "Close All" confirm button
    Then all 3 positions are closed at market price
    And success toast shows "Successfully closed 3 positions"
    And user is returned to home screen
    And positions carousel is empty or shows remaining positions

  Scenario: User closes all positions with partial failure
    Given user has 2 open positions
    And one position will fail to close (simulated network error)

    When user taps "Close All" and confirms
    Then 1 position closes successfully
    And 1 position fails to close
    And partial success toast shows "Successfully closed 1 of 2 positions"
    And failed position remains in positions carousel

  Scenario: User cancels all orders at once
    Given user is on Perps home screen
    And user has 4 open orders
    And "Cancel All" button is visible

    When user taps "Cancel All" button
    Then confirmation modal appears showing order count

    When user taps "Cancel All" confirm button
    Then all 4 orders are cancelled
    And success toast shows "Successfully cancelled 4 orders"
    And orders carousel is empty or shows remaining orders

  Scenario: User closes single position using shared summary component
    Given user is on single position close view
    And position has $1000 margin and +$150 P&L

    When user views the summary section
    Then user sees identical layout and formatting as close all summary:
      - Margin: $1,150 (includes P&L: +$150)
      - Fees: -$5.75 (with discount indicator if applicable)
      - You'll receive: $1,144.25
      - Estimated points (if rewards enabled)

    When user taps info icons
    Then same tooltips appear as in close all flow

  Scenario: User accesses learn more content
    Given user is on Perps home screen
    And "Learn more about perps" component is visible at bottom

    When user taps "Learn More" button
    Then external browser opens to MetaMask perps educational content
```

## **Screenshots/Recordings**

### **Before**

- Previous market list view showed only markets
- No home dashboard or overview
- No way to close all positions at once
- No market sorting or filtering
- Duplicate JSX for close position summaries

### **After**

- Comprehensive home screen with carousels and activity
- One-tap access to positions, orders, markets, and activity
- Close All and Cancel All buttons for batch operations
- Full market sorting and search functionality
- Shared `PerpsCloseSummary` component across all close flows
- Consistent UX patterns throughout

## **Pre-merge author checklist**

- [x] I've followed [MetaMask Contributor Docs](https://github.com/MetaMask/contributor-docs) and [MetaMask Mobile Coding Standards](https://github.com/MetaMask/metamask-mobile/blob/main/.github/guidelines/CODING_GUIDELINES.md).
- [x] I've completed the PR template to the best of my ability
- [x] I've included tests if applicable
- [x] I've documented my code using [JSDoc](https://jsdoc.app/) format if applicable
- [x] I've applied the right labels on the PR (see [labeling guidelines](https://github.com/MetaMask/metamask-mobile/blob/main/.github/guidelines/LABELING_GUIDELINES.md)). Not required for external contributors.

## **Pre-merge reviewer checklist**

- [ ] I've manually tested the PR (e.g. pull and build branch, run the app, test code being changed).
- [ ] I confirm that this PR addresses all acceptance criteria described in the ticket it closes and includes the necessary testing evidence such as recordings and or screenshots.

---

## **Implementation Details**

### Files Changed Summary

**Total: 65 files changed, 4,855 insertions(+), 398 deletions(-)**

### New Components (22 files)

- `PerpsHomeView/` - Main home screen (replaced PerpsMarketListView)
- `PerpsSearchBar/` - Market search input component
- `PerpsMarketList/` - Reusable market list component
- `PerpsTrendingMarkets/` - Trending markets vertical list (top 5, non-scrollable)
- `PerpsRecentActivityList/` - Recent trades list
- `PerpsMarketSortDropdowns/` - Sort field/direction dropdowns
- `PerpsMarketSortFieldBottomSheet/` - Sort field selector bottom sheet
- `PerpsMarketSortDirectionBottomSheet/` - Sort direction selector bottom sheet
- `PerpsMarketSortFilters/` - Combined sort filter UI
- `PerpsCloseAllPositionsView/` - Full-screen close all view
- `PerpsCloseAllPositionsModal/` - Close all confirmation modal
- `PerpsCancelAllOrdersView/` - Full-screen cancel all view
- `PerpsCancelAllOrdersModal/` - Cancel all confirmation modal
- `PerpsCloseSummary/` - **SHARED** close position summary component

### New Hooks (4 files)

- `usePerpsHomeData.ts` - Combined home screen data fetching
- `usePerpsSorting.ts` - Market sorting state management
- `usePerpsSearch.ts` - Market search filtering
- `usePerpsCloseAllCalculations.ts` - Multi-position fee aggregation

### Modified Core Files (6 files)

- `PerpsController.ts` - Added `closePositions()` and `cancelOrders()` batch methods
- `usePerpsOrderFees.ts` - Enhanced to support array params with aggregation
- `PerpsClosePositionView.tsx` - Refactored to use shared PerpsCloseSummary (net -138 lines)
- `PerpsMarketListView.tsx` - Updated to integrate with home and add sorting
- `PerpsCard.tsx` - Minor updates for carousel integration
- `PerpsMarketRowItem.tsx` - Added fields for sorting data display

### Configuration & Infrastructure (7 files)

- `perpsConfig.ts` - Added HOME_SCREEN_CONFIG, MARKET_SORTING_CONFIG, LEARN_MORE_CONFIG
- `sortMarkets.ts` - Market sorting utility function
- `routes/index.tsx` - Added routes for new views
- `Routes.ts` - Added route constants
- `eventNames.ts` - Added new event properties for tracking
- `en.json` - Added 58 new translation keys
- `types/index.ts` - Added types for batch operations

### Code Quality Improvements

- **Eliminated Duplication**: Shared `PerpsCloseSummary` component removes 138 lines of duplicate JSX from close position views
- **Type Safety**: All new code fully typed with TypeScript
- **Consistent Patterns**: All hooks follow object parameter pattern for extensibility
- **Performance**: Batch operations execute in parallel with proper error handling
- **Accessibility**: All interactive elements properly labeled
- **Localization**: All user-facing strings externalized to translation files
