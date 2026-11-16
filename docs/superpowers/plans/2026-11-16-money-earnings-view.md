# Money Earnings View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Earnings tab screen from the approved Figma design with live historical earnings, summary values, range selection, and Money navigation actions.

**Architecture:** Keep `MoneyEarningsView` as the coordinator for route state, query state, derived values, and navigation. Put date-window aggregation in a pure utility and keep chart and summary rendering in focused sibling components. Use MMDS React Native primitives and existing Money hooks.

**Tech Stack:** React Native, TypeScript, React Navigation, TanStack Query, Redux selectors through existing hooks, `@metamask/design-system-react-native`, `useTailwind`, Jest.

## Global Constraints

- Implement only the Earnings tab; APY and Allocation remain visible but unsupported.
- Default `activeTab` to `earnings`; normalize unsupported route values to `earnings`.
- Use `useMoneyHistoricalEarnings` for chart, 30D, and 1Y data.
- Keep 1Y as the temporary Lifetime substitute and add the required code TODO.
- Use `useMoneyAccountWithdrawal` for Withdraw and `useMoneyDepositNavigation` for Add.
- Surface loading, empty, and query-error states; never replace failed data with fake earnings.
- Use MMDS primitives, `useTailwind`, semantic tokens, and no new `StyleSheet`.
- Do not modify test files until the user explicitly approves test updates.

---

### Task 1: Add Earnings copy and stable test IDs

**Files:**

- Modify: `locales/languages/en.json` inside `money.earnings`
- Create: `app/components/UI/Money/Views/MoneyEarningsView/MoneyEarningsView.testIds.ts`

**Interfaces:**

- Produces localized keys for screen labels and a `MoneyEarningsViewTestIds` object for stable UI selectors.

- [ ] **Step 1: Add the missing English copy**

Add keys under the existing `money.earnings` object:

```json
{
  "title": "Earnings",
  "tab_earnings": "Earnings",
  "tab_apy": "APY",
  "tab_allocation": "Allocation",
  "earned_last_30_days": "Earned in the last 30 days",
  "range_1w": "1W",
  "range_1m": "1M",
  "range_3m": "3M",
  "range_6m": "6M",
  "range_1y": "1Y",
  "this_month": "This month",
  "lifetime": "Lifetime",
  "projected_in_1_year": "Projected in 1 year",
  "projection_disclaimer": "Estimate, includes compounding",
  "data_through": "Data through {{date}}",
  "withdraw": "Withdraw",
  "add": "Add",
  "no_lockups": "No lock-ups",
  "loading": "Loading earnings",
  "error": "We couldn't load earnings. Try again.",
  "retry": "Retry",
  "empty": "No earnings history yet."
}
```

- [ ] **Step 2: Create stable test IDs**

Export constants for `CONTAINER`, `BACK_BUTTON`, `TAB_EARNINGS`, `TAB_APY`,
`TAB_ALLOCATION`, `CHART`, `RANGE_SELECTOR`, `SUMMARY`, `WITHDRAW_BUTTON`,
`ADD_BUTTON`, `LOADING`, `ERROR`, and `EMPTY`.

- [ ] **Step 3: Run formatting validation**

Run: `yarn prettier --check locales/languages/en.json app/components/UI/Money/Views/MoneyEarningsView/MoneyEarningsView.testIds.ts`

Expected: both files pass formatting.

---

### Task 2: Add pure historical earnings range calculations

**Files:**

- Create: `app/components/UI/Money/Views/MoneyEarningsView/earningsHistory.ts`
- Test, only after explicit test approval: `app/components/UI/Money/Views/MoneyEarningsView/earningsHistory.test.ts`

**Interfaces:**

```ts
export type EarningsRange = '1W' | '30D' | '3M' | '6M' | '1Y';

export interface EarningsPoint {
  timestamp: string;
  amount: number;
}

export const EARNINGS_RANGES: readonly EarningsRange[];

export const getRangeEntries: (
  entries: InterestHistoryEntry[],
  range: EarningsRange,
) => InterestHistoryEntry[];

export const getDailyEarningsPoints: (
  entries: InterestHistoryEntry[],
) => EarningsPoint[];

export const sumEarnings: (entries: InterestHistoryEntry[]) => number;
```

- [ ] **Step 1: Define range lengths and deterministic date selection**

Use `7`, `30`, `90`, `180`, and `365` day windows. Derive the window end
from the newest valid API timestamp, not the device clock, so stale API data
still renders the latest returned period correctly. Preserve API strings until
the utility boundary, then convert finite numeric values to numbers.

- [ ] **Step 2: Aggregate entries by UTC calendar day**

Group entries with the same UTC date and sum their
`interest_earned_usd` values. Return points ordered oldest-to-newest. Keep
invalid numeric values out of calculations and let the view show the query's
real error state for request failures; do not manufacture zero values.

- [ ] **Step 3: Add focused tests after approval**

Cover:

```ts
expect(getRangeEntries(entries, '30D')).toHaveLength(30);
expect(getDailyEarningsPoints(entries)).toEqual([
  { timestamp: '2026-11-13T00:00:00.000Z', amount: 3.05 },
]);
expect(sumEarnings(entries)).toBeCloseTo(84.2);
```

Also cover newest-date anchoring, repeated timestamps on one day, each range
length, and malformed numeric values.

- [ ] **Step 4: Run the focused test**

Run: `yarn jest app/components/UI/Money/Views/MoneyEarningsView/earningsHistory.test.ts --no-coverage`

Expected: PASS after tests are approved and implemented.

---

### Task 3: Build the chart presentation

**Files:**

- Create: `app/components/UI/Money/Views/MoneyEarningsView/EarningsChart.tsx`

**Interfaces:**

```ts
interface EarningsChartProps {
  entries: InterestHistoryEntry[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  selectedRange: EarningsRange;
  onRangeChange: (range: EarningsRange) => void;
}
```

- [ ] **Step 1: Compose the hero and range controls**

Use `Text` variants for the alternative label, display amount, and date range.
Use `FilterButton` with `FilterButtonVariant.Secondary`, small size, and
selected state for the five range controls. Each range control must expose a
label and selected accessibility state.

- [ ] **Step 2: Render scaled daily bars**

Render daily points in a `Box` row with 160px chart height. Scale each bar
against the maximum positive daily value, enforce a visible minimum height for
non-zero values, and keep the latest bar at full primary color while older
bars use the muted primary token. Do not animate bars.

- [ ] **Step 3: Render visible state branches**

Render a design-system `Skeleton` while loading. Render an inline error
message and `Retry` button when the query errors. Render the localized empty
state when there are no points. Render no empty-looking chart in either error
or empty state.

- [ ] **Step 4: Run lint on the component**

Run: `yarn eslint app/components/UI/Money/Views/MoneyEarningsView/EarningsChart.tsx`

Expected: no ESLint errors or unused imports.

---

### Task 4: Build the summary card

**Files:**

- Create: `app/components/UI/Money/Views/MoneyEarningsView/EarningsSummary.tsx`

**Interfaces:**

```ts
interface EarningsSummaryProps {
  thisMonth: number;
  lifetime: number;
  projectedOneYear: number;
  dataThrough: string | undefined;
}
```

- [ ] **Step 1: Render the three summary rows**

Use a muted rounded card with MMDS `Box` and `Text`. Render signed USD values
through the existing `moneyFormatUsd` utility. The projected row includes the
localized “Estimate, includes compounding” sublabel.

- [ ] **Step 2: Add the temporary Lifetime reminder**

Place this exact code comment beside the 1Y-to-Lifetime mapping:

```ts
// TODO: Replace 1Y earnings with a lifetime endpoint once available.
// 1Y is not a valid lifetime substitute after the account is older than one year.
```

- [ ] **Step 3: Render the data-through label**

Format the newest entry timestamp in UTC and pass it through the localized
`data_through` string. Render no timestamp when the history is empty.

- [ ] **Step 4: Run lint on the component**

Run: `yarn eslint app/components/UI/Money/Views/MoneyEarningsView/EarningsSummary.tsx`

Expected: no ESLint errors or unused imports.

---

### Task 5: Wire the Earnings view and navigation

**Files:**

- Modify: `app/components/UI/Money/Views/MoneyEarningsView/MoneyEarningsView.tsx`

**Interfaces:**

```ts
type MoneyEarningsRoute = RouteProp<MoneyNavigationParamList, 'MoneyEarnings'>;
```

- [ ] **Step 1: Read route and existing Money hooks**

Use `useRoute<MoneyEarningsRoute>()`, `useNavigation<AppNavigationProp>()`,
`useMoneyHistoricalEarnings()`, `useMoneyAccountWithdrawal()`, and
`useMoneyDepositNavigation()`.

- [ ] **Step 2: Normalize tab state**

Use:

```ts
const requestedTab = params?.activeTab ?? 'earnings';
const activeTab = requestedTab === 'earnings' ? requestedTab : 'earnings';
```

Render APY and Allocation as inactive, non-interactive tabs. Their content
must not be rendered.

- [ ] **Step 3: Derive selected range data**

Keep `selectedRange` in local state, defaulting to `30D`. Use `useMemo` for
range entries, chart points, 30D total, 1Y total, projected estimate, and
latest timestamp. Projected estimate is `max(0, thisMonth) * 12` for this
prototype, formatted as an approximate positive amount.

- [ ] **Step 4: Compose the full screen**

Use `HeaderStandard`, a safe-area-aware `ScrollView`, `EarningsChart`,
`EarningsSummary`, and a footer with secondary Withdraw and primary Add
buttons. Keep the footer at the bottom with flex layout and preserve the
Figma spacing.

- [ ] **Step 5: Wire actions**

Call `void initiateWithdrawal()` from Withdraw. Call
`void navigateToMoneyDeposit()` from Add. Do not catch and discard errors;
existing Money hooks surface failures.

- [ ] **Step 6: Run typecheck and lint**

Run:

```bash
yarn eslint app/components/UI/Money/Views/MoneyEarningsView/MoneyEarningsView.tsx
yarn lint:tsc
```

Expected: no new lint or TypeScript errors.

---

### Task 6: Add view behavior coverage after approval

**Files:**

- Test, only after explicit test approval: `app/components/UI/Money/Views/MoneyEarningsView/MoneyEarningsView.test.tsx`

**Interfaces:**

Mock `useMoneyHistoricalEarnings`, `useMoneyAccountWithdrawal`,
`useMoneyDepositNavigation`, `useNavigation`, and `useRoute`. Keep all API
requests mocked through the hook; do not call the real Money API.

- [ ] **Step 1: Add behavior tests**

Cover default Earnings selection, unsupported route normalization, range
selection, 30D hero and summary values, 1Y Lifetime value, projected value,
loading/error/empty states, Withdraw action, and Add action.

- [ ] **Step 2: Run the focused view test**

Run: `yarn jest app/components/UI/Money/Views/MoneyEarningsView/MoneyEarningsView.test.tsx --no-coverage`

Expected: PASS.

- [ ] **Step 3: Run lint on touched test files**

Run: `yarn eslint app/components/UI/Money/Views/MoneyEarningsView/MoneyEarningsView.test.tsx`

Expected: no ESLint or unused-import errors.

---

### Task 7: Verify the requested screen

**Files:**

- No additional files.

- [ ] **Step 1: Run focused verification**

Run:

```bash
yarn jest app/components/UI/Money/hooks/useMoneyHistoricalEarnings.test.ts --no-coverage
yarn lint:tsc
yarn eslint app/components/UI/Money/Views/MoneyEarningsView
```

Expected: all commands pass, or any pre-existing unrelated failures are
reported separately.

- [ ] **Step 2: Run linter diagnostics**

Use Cursor `ReadLints` on every modified TypeScript file. Fix unused imports
and any diagnostics introduced by this implementation.

- [ ] **Step 3: Review the final diff**

Confirm only Earnings implementation, required localized copy, and approved
tests are included. Confirm APY and Allocation behavior remains out of scope.
