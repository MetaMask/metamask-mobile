# Money Earnings View

## Goal

Implement the Earnings tab from the supplied Money Figma design in
`MoneyEarningsView`. APY and Allocation content remain out of scope.

## Screen structure

The view contains:

1. Standard header titled “Earnings” with back navigation.
2. Three visible tabs: Earnings, APY, and Allocation.
3. Earnings content:
   - 30-day earnings hero value and date range.
   - Historical earnings bar chart.
   - Range controls: 1W, 1M, 3M, 6M, and 1Y.
   - Earnings Summary card with This month, Lifetime, and Projected in 1 year.
   - Data-through timestamp.
4. Footer actions:
   - Secondary Withdraw button.
   - Primary Add button.
   - “No lock-ups” supporting text.

The view uses MMDS primitives and existing Money navigation hooks. The chart
uses lightweight layout primitives for daily bars; no chart library is needed
for this prototype.

## Route and tab behavior

`MoneyEarnings` accepts the existing optional `activeTab` route parameter.
When omitted, the selected tab is `earnings`.

Only Earnings is implemented. APY and Allocation remain visible as inactive,
non-interactive tabs until their screens are added. Unsupported route values
normalize to Earnings so the screen never presents an implemented-looking tab
without corresponding content.

## Data flow

`useMoneyHistoricalEarnings` supplies the historical entries. The view derives
the selected range with memoized calculations:

- `1W`: latest seven days.
- `30D`: latest thirty days.
- `3M`: latest ninety days.
- `6M`: latest 180 days.
- `1Y`: latest 365 days.

The chart renders one bar per day in the selected range. The 30D total powers
the hero and This month summary value. The 1Y total powers the Lifetime
prototype value.

Projected one-year earnings use the current 30D earnings as a prototype
annualized estimate. This is presentation-only until the product defines the
authoritative projection input and compounding model.

## Error and loading behavior

The query's loading state renders a visible loading treatment for the data
sections. Query errors remain visible through an inline error message with a
retry action. No placeholder earnings values are shown when data is missing.

Empty history renders an explicit empty state rather than an empty chart.

## Navigation behavior

- Withdraw invokes `useMoneyAccountWithdrawal().initiateWithdrawal`.
- Add invokes `useMoneyDepositNavigation().navigateToMoneyDeposit`.
- Async action failures are logged by the existing Money hooks; the view does
  not swallow errors.

## Component boundaries

`MoneyEarningsView` coordinates route state, query state, derived values, and
navigation. Focused local components handle:

- `EarningsChart`: range controls, bars, loading, and empty/error states.
- `EarningsSummary`: summary card rows and data-through label.

All layout uses `Box`, `Text`, `Button`, `FilterButton`, and existing design
tokens. New `StyleSheet` or raw palette values are not introduced.

## Testing boundary

No tests are changed without explicit approval. If approved, focused view
coverage will mock the historical query and navigation hooks and cover:

- default Earnings tab when `activeTab` is absent;
- visible range and summary values;
- loading, error, and empty states;
- Withdraw and Add button actions;
- unsupported tab route values remaining on Earnings.

## Scope

Included:

- Earnings tab screen implementation.
- Historical chart and summary presentation.
- Earnings range selection.
- Withdraw and Add navigation wiring.
- Default and unsupported tab route behavior.

Excluded:

- APY tab implementation.
- Allocation tab implementation.
- Changes to the historical earnings API contract.
- Lifetime endpoint support.
- Code Connect library publishing or external Figma library changes.
