# Predict Feature Refactoring Tasks

This document provides a prioritized breakdown of all refactoring tasks for the Predict feature. Tasks are organized by priority level with effort estimates and progress tracking.

## Table of Contents

- [Overview](#overview)
- [Priority Levels](#priority-levels)
- [P0: Critical (Do First)](#p0-critical-do-first)
- [P1: High Priority](#p1-high-priority)
- [P2: Medium Priority](#p2-medium-priority)
- [P3: Low Priority (Nice to Have)](#p3-low-priority-nice-to-have)
- [Execution Waves](#execution-waves)
- [Progress Tracking](#progress-tracking)

---

## Overview

### Summary Statistics

| Metric                 | Value          |
| ---------------------- | -------------- |
| Total Tasks            | 26             |
| P0 (Critical)          | 5 tasks        |
| P1 (High)              | 13 tasks       |
| P2 (Medium)            | 6 tasks        |
| P3 (Low)               | 2 tasks        |
| Estimated Total Effort | XL (40+ hours) |

### Task Distribution

```
P0 ████████░░░░░░░░░░░░  19% (5 tasks)  - Component decomposition
P1 ██████████████████░░  50% (13 tasks) - Styling & types
P2 ████████████░░░░░░░░  23% (6 tasks)  - Test coverage
P3 ████░░░░░░░░░░░░░░░░   8% (2 tasks)  - Documentation polish
```

---

## Priority Levels

| Priority | Criteria                                        | Examples                                 |
| -------- | ----------------------------------------------- | ---------------------------------------- |
| **P0**   | Blocks other work; high maintainability impact  | Component decomposition, core refactors  |
| **P1**   | Significant improvement; aligns with guidelines | StyleSheet migration, type consolidation |
| **P2**   | Quality improvement; doesn't block features     | Test coverage, memoization               |
| **P3**   | Polish; nice to have                            | Documentation updates, cleanup           |

---

## P0: Critical (Do First)

These tasks are prerequisites for other work and have the highest impact on maintainability.

### Task 1: Documentation - Architecture Overview

**Status**: ✅ Completed

- **File**: `docs/predict/architecture-overview.md`
- **Effort**: S (1-2 hours)
- **Description**: Document current vs target architecture, component hierarchy, data flow patterns
- **Commit**: `docs(predict): add architecture overview documentation`

---

### Task 2: Documentation - Refactoring Tasks

**Status**: ✅ Completed

- **File**: `docs/predict/refactoring-tasks.md`
- **Effort**: S (1-2 hours)
- **Description**: This document - task breakdown with priorities
- **Commit**: `docs(predict): add refactoring tasks breakdown`

---

### Task 3: Documentation - Implementation Guide

**Status**: ⏳ In Progress

- **File**: `docs/predict/implementation-guide.md`
- **Effort**: S (1-2 hours)
- **Description**: Patterns to follow, anti-patterns to avoid, migration examples
- **Commit**: `docs(predict): add implementation guide for refactoring`

---

### Task 4: Remove Super Bowl LX Temporary Fix

**Status**: ⬜ Pending

- **File**: `app/components/UI/Predict/providers/polymarket/utils.ts:662`
- **Effort**: XS (<1 hour)
- **Description**: Remove outdated temporary fix for Super Bowl LX event
- **Verification**:
  ```bash
  grep -n "Super Bowl LX" app/components/UI/Predict/providers/polymarket/utils.ts
  # Expected: No matches
  yarn jest app/components/UI/Predict/providers/polymarket/utils.test.ts
  ```
- **Commit**: `fix(predict): remove Super Bowl LX temporary fix`

---

### Task 5: Fix Navigation Stack TODO

**Status**: ⬜ Pending

- **File**: `app/components/UI/Predict/hooks/usePredictClaim.ts:35`
- **Effort**: S (1-2 hours)
- **Description**: Address TODO about navigation stack fix
- **Verification**:
  ```bash
  yarn jest app/components/UI/Predict/hooks/usePredictClaim.test.ts
  ```
- **Commit**: `fix(predict): address navigation stack TODO in usePredictClaim`

---

### Task 6: Decompose PredictMarketDetails.tsx

**Status**: ⬜ Pending

- **File**: `app/components/UI/Predict/views/PredictMarketDetails/PredictMarketDetails.tsx`
- **Effort**: L (4-6 hours)
- **Current State**: 1,391 lines, 30+ hooks, 7 inline render functions
- **Target State**: <500 lines (orchestration only)
- **Extract Components**:
  - [ ] `PredictMarketDetailsHeader` - Header with title, back button, share
  - [ ] `PredictMarketDetailsChart` - Chart section with timeframe selector
  - [ ] `PredictMarketDetailsOutcomes` - Outcome cards/buttons
  - [ ] `PredictMarketDetailsPositions` - User positions section
  - [ ] `PredictMarketDetailsFooter` - Action buttons (buy/sell/claim)
- **Verification**:
  ```bash
  wc -l app/components/UI/Predict/views/PredictMarketDetails/PredictMarketDetails.tsx
  # Expected: <500 lines
  yarn jest app/components/UI/Predict/views/PredictMarketDetails/
  ```
- **Commit**: `refactor(predict): decompose PredictMarketDetails into smaller components`

---

### Task 7: Decompose PredictFeed.tsx

**Status**: ⬜ Pending

- **File**: `app/components/UI/Predict/views/PredictFeed/PredictFeed.tsx`
- **Effort**: M (3-4 hours)
- **Current State**: 738 lines, prop drilling (scrollHandler, headerHeight)
- **Target State**: <400 lines
- **Extract Components**:
  - [ ] `PredictFeedHeader` - Header with tabs/categories
  - [ ] `PredictFeedList` - Market list with infinite scroll
  - [ ] `PredictFeedEmpty` - Empty state
  - [ ] `PredictFeedError` - Error state
- **Verification**:
  ```bash
  wc -l app/components/UI/Predict/views/PredictFeed/PredictFeed.tsx
  # Expected: <400 lines
  yarn jest app/components/UI/Predict/views/PredictFeed/
  ```
- **Commit**: `refactor(predict): decompose PredictFeed into smaller components`

---

### Task 8: Extract PredictController Error Handling

**Status**: ⬜ Pending

- **File**: `app/components/UI/Predict/controllers/PredictController.ts`
- **Effort**: M (3-4 hours)
- **Current State**: 2,401 lines, 15+ repeated error handling blocks
- **Target State**: <2,000 lines
- **Actions**:
  - [ ] Create `controllerErrorHandler.ts` utility
  - [ ] Extract pattern: `withErrorHandling(operation, context): Result<T>`
  - [ ] Update all 15+ methods to use new pattern
- **Verification**:
  ```bash
  wc -l app/components/UI/Predict/controllers/PredictController.ts
  # Expected: <2000 lines
  yarn jest app/components/UI/Predict/controllers/
  ```
- **Commit**: `refactor(predict): extract error handling pattern from PredictController`

---

### Task 9: Consolidate Toast Hooks

**Status**: ⬜ Pending

- **Files**:
  - `app/components/UI/Predict/hooks/usePredictToasts.tsx`
  - `app/components/UI/Predict/hooks/usePredictDepositToasts.tsx`
  - `app/components/UI/Predict/hooks/usePredictClaimToasts.tsx`
  - `app/components/UI/Predict/hooks/usePredictWithdrawToasts.ts`
- **Effort**: M (2-3 hours)
- **Current State**: 4 separate hooks with duplicated logic
- **Target State**: 1 unified hook with backward-compatible exports
- **Actions**:
  - [ ] Create `usePredictToast(type: 'deposit' | 'claim' | 'withdraw' | 'order')`
  - [ ] Re-export old hooks as aliases for backward compatibility
- **Verification**:
  ```bash
  yarn jest app/components/UI/Predict/hooks/usePredictToasts
  yarn jest app/components/UI/Predict/hooks/usePredictDepositToasts
  yarn jest app/components/UI/Predict/hooks/usePredictClaimToasts
  yarn jest app/components/UI/Predict/hooks/usePredictWithdrawToasts
  ```
- **Commit**: `refactor(predict): consolidate toast hooks into unified usePredictToast`

---

## P1: High Priority

### Tasks 10-19: Migrate StyleSheet Files to Tailwind

**Effort**: S each (1-2 hours), M total (10-15 hours)

All files using `StyleSheet.create()` need migration to Tailwind + design system.

| #   | Component               | File                                                                   | Status |
| --- | ----------------------- | ---------------------------------------------------------------------- | ------ |
| 10  | PredictMarketOutcome    | `components/PredictMarketOutcome/PredictMarketOutcome.styles.ts`       | ⬜     |
| 11  | PredictMarketSingle     | `components/PredictMarketSingle/PredictMarketSingle.styles.ts`         | ⬜     |
| 12  | PredictPosition         | `components/PredictPosition/PredictPosition.styles.ts`                 | ⬜     |
| 13  | PredictPositionEmpty    | `components/PredictPositionEmpty/PredictPositionEmpty.styles.ts`       | ⬜     |
| 14  | PredictPositionResolved | `components/PredictPositionResolved/PredictPositionResolved.styles.ts` | ⬜     |
| 15  | PredictOffline          | `components/PredictOffline/PredictOffline.styles.ts`                   | ⬜     |
| 16  | PredictGTMModal         | `components/PredictGTMModal/PredictGTMModal.styles.ts`                 | ⬜     |
| 17  | PredictMarketRowItem    | `components/PredictMarketRowItem/PredictMarketRowItem.styles.ts`       | ⬜     |
| 18  | PredictMarketMultiple   | `components/PredictMarketMultiple/PredictMarketMultiple.styles.ts`     | ⬜     |
| 19  | PredictSellPreview      | `views/PredictSellPreview/PredictSellPreview.styles.ts`                | ⬜     |

**Migration Steps** (for each):

1. Replace `View` → `Box`
2. Replace `Text` → `Text` with `TextVariant`
3. Convert styles to `twClassName` props
4. Use semantic color tokens
5. Delete `.styles.ts` file
6. Run tests

**Verification** (for each):

```bash
# Verify .styles.ts file removed
test ! -f app/components/UI/Predict/components/<ComponentName>/<ComponentName>.styles.ts

# Verify no StyleSheet in component
grep -r "StyleSheet.create" app/components/UI/Predict/components/<ComponentName>/

# Run tests
yarn jest app/components/UI/Predict/components/<ComponentName>/
```

**Commit** (each): `refactor(predict): migrate <ComponentName> from StyleSheet to Tailwind`

---

### Task 20: Consolidate Duplicate Chart Types

**Status**: ⬜ Pending

- **Files**:
  - `app/components/UI/Predict/components/PredictDetailsChart/PredictDetailsChart.tsx` (ChartSeries)
  - `app/components/UI/Predict/components/PredictGameChart/PredictGameChart.types.ts` (GameChartSeries)
- **Effort**: S (1-2 hours)
- **Actions**:
  - [ ] Create `types/chart.ts` with unified `ChartSeries` type
  - [ ] Update all imports
  - [ ] Consolidate tooltip types if duplicated
- **Verification**:
  ```bash
  grep "ChartSeries" app/components/UI/Predict/types/chart.ts
  yarn lint:tsc
  yarn jest app/components/UI/Predict/components/PredictDetailsChart/
  yarn jest app/components/UI/Predict/components/PredictGameChart/
  ```
- **Commit**: `refactor(predict): consolidate duplicate chart types`

---

### Task 21: Add Missing Memoization to PredictMarketDetails

**Status**: ⬜ Pending (Blocked by Task 6)

- **File**: `app/components/UI/Predict/views/PredictMarketDetails/`
- **Effort**: S (1-2 hours)
- **Dependencies**: Task 6 (component decomposition)
- **Actions**:
  - [ ] Add `React.memo()` to extracted sub-components
  - [ ] Add `useMemo` for expensive computations
  - [ ] Add `useCallback` for handlers passed to children
- **Verification**:
  ```bash
  grep -r "React.memo" app/components/UI/Predict/views/PredictMarketDetails/components/
  # Expected: At least 3 matches
  yarn jest app/components/UI/Predict/views/PredictMarketDetails/
  ```
- **Commit**: `perf(predict): add memoization to PredictMarketDetails sub-components`

---

### Task 22: Fix Prop Drilling with Context

**Status**: ⬜ Pending (Blocked by Task 7)

- **File**: `app/components/UI/Predict/views/PredictFeed/`
- **Effort**: S (1-2 hours)
- **Dependencies**: Task 7 (PredictFeed decomposition)
- **Actions**:
  - [ ] Create `PredictFeedContext.tsx`
  - [ ] Provide scrollHandler, headerHeight, tabBarHeight via context
  - [ ] Update sub-components to consume context
- **Verification**:
  ```bash
  test -f app/components/UI/Predict/views/PredictFeed/PredictFeedContext.tsx
  yarn jest app/components/UI/Predict/views/PredictFeed/
  ```
- **Commit**: `refactor(predict): replace prop drilling with PredictFeedContext`

---

## P2: Medium Priority

### Task 23: Add Tests for PredictMarketRowItem

**Status**: ⬜ Pending

- **File**: `app/components/UI/Predict/components/PredictMarketRowItem/`
- **Effort**: S (1-2 hours)
- **Actions**:
  - [ ] Create `PredictMarketRowItem.test.tsx`
  - [ ] Test rendering with various props
  - [ ] Test user interactions
- **Reference**: `components/PredictMarketSingle/PredictMarketSingle.test.tsx`
- **Verification**:
  ```bash
  yarn jest app/components/UI/Predict/components/PredictMarketRowItem/
  ```
- **Commit**: `test(predict): add tests for PredictMarketRowItem`

---

### Task 24: Add Tests for Chart Subcomponents

**Status**: ⬜ Pending

- **Files**:
  - `app/components/UI/Predict/components/PredictDetailsChart/components/ChartArea.tsx`
  - `app/components/UI/Predict/components/PredictDetailsChart/components/ChartGrid.tsx`
  - `app/components/UI/Predict/components/PredictDetailsChart/components/TimeframeSelector.tsx`
- **Effort**: M (2-3 hours)
- **Actions**:
  - [ ] Create `ChartArea.test.tsx`
  - [ ] Create `ChartGrid.test.tsx`
  - [ ] Create `TimeframeSelector.test.tsx`
- **Verification**:
  ```bash
  ls app/components/UI/Predict/components/PredictDetailsChart/components/*.test.tsx
  yarn jest app/components/UI/Predict/components/PredictDetailsChart/
  ```
- **Commit**: `test(predict): add tests for chart subcomponents`

---

### Task 25: Update README with New Architecture

**Status**: ⬜ Pending (Blocked by Tasks 6-9)

- **File**: `app/components/UI/Predict/README.md`
- **Effort**: S (1 hour)
- **Dependencies**: Tasks 6-9, 10-19
- **Actions**:
  - [ ] Update component structure diagram
  - [ ] Update hook documentation (consolidated hooks)
  - [ ] Add link to `docs/predict/` for detailed documentation
- **Verification**:
  ```bash
  grep -E "(PredictFeedContext|usePredictToast|architecture-overview)" app/components/UI/Predict/README.md
  ```
- **Commit**: `docs(predict): update README with new architecture`

---

### Task 26: Archive Outdated Documentation

**Status**: ⬜ Pending

- **Files**: `docs/predict/tasks/`
- **Effort**: S (1 hour)
- **Actions**:
  - [ ] Review all files in `docs/predict/tasks/`
  - [ ] Mark completed/outdated tasks as archived
  - [ ] Ensure consistency with new documentation
- **Commit**: `docs(predict): archive outdated task documentation`

---

## P3: Low Priority (Nice to Have)

### Future Considerations

These tasks are not included in the current plan but could be addressed later:

1. **Performance Profiling**: Deep performance analysis with React DevTools Profiler
2. **Accessibility Audit**: Ensure all components meet a11y standards
3. **Error Boundary Implementation**: Add error boundaries around key components
4. **Storybook Stories**: Add Storybook stories for new components

---

## Execution Waves

Tasks are organized into waves that can be executed in parallel within each wave.

### Wave 1: Documentation & Quick Wins (Start Immediately)

```
┌─────────────────────────────────────────────────────────────┐
│ Task 1: Architecture Overview    ✅ Completed               │
│ Task 2: Refactoring Tasks        ✅ Completed               │
│ Task 3: Implementation Guide     ⏳ In Progress             │
│ Task 4: Remove Super Bowl Fix    ⬜ Pending                 │
│ Task 5: Fix Navigation TODO      ⬜ Pending                 │
└─────────────────────────────────────────────────────────────┘
```

### Wave 2: P0 Component Decomposition (After Wave 1)

```
┌─────────────────────────────────────────────────────────────┐
│ Task 6: Decompose PredictMarketDetails    ⬜ Pending        │
│ Task 7: Decompose PredictFeed             ⬜ Pending        │
│ Task 8: Extract Controller Error Handling ⬜ Pending        │
│ Task 9: Consolidate Toast Hooks           ⬜ Pending        │
└─────────────────────────────────────────────────────────────┘
All tasks in Wave 2 can run in parallel.
```

### Wave 3: P1 Styling & Types (After Wave 2)

```
┌─────────────────────────────────────────────────────────────┐
│ Tasks 10-19: StyleSheet → Tailwind migrations (10 tasks)   │
│ Task 20: Consolidate Chart Types                            │
│ Task 21: Add Memoization (blocked by Task 6)               │
│ Task 22: Fix Prop Drilling (blocked by Task 7)             │
└─────────────────────────────────────────────────────────────┘
Tasks 10-19 and 20 can run in parallel.
Tasks 21-22 depend on Wave 2 completion.
```

### Wave 4: P2 Test Coverage & Polish (After Wave 3)

```
┌─────────────────────────────────────────────────────────────┐
│ Task 23: Tests for PredictMarketRowItem                    │
│ Task 24: Tests for Chart Subcomponents                      │
│ Task 25: Update README (blocked by Waves 2-3)              │
│ Task 26: Archive Outdated Docs                              │
└─────────────────────────────────────────────────────────────┘
All tasks can run in parallel.
```

---

## Progress Tracking

### Overall Progress

```
Wave 1: ██████████░░░░░░░░░░  60% (3/5 tasks)
Wave 2: ░░░░░░░░░░░░░░░░░░░░   0% (0/4 tasks)
Wave 3: ░░░░░░░░░░░░░░░░░░░░   0% (0/13 tasks)
Wave 4: ░░░░░░░░░░░░░░░░░░░░   0% (0/4 tasks)
────────────────────────────────────────────
Total:  ████░░░░░░░░░░░░░░░░  12% (3/26 tasks)
```

### Task Checklist

| #   | Task                              | Priority | Status | Wave |
| --- | --------------------------------- | -------- | ------ | ---- |
| 1   | Architecture Overview Doc         | P0       | ✅     | 1    |
| 2   | Refactoring Tasks Doc             | P0       | ✅     | 1    |
| 3   | Implementation Guide Doc          | P0       | ⏳     | 1    |
| 4   | Remove Super Bowl LX Fix          | P0       | ⬜     | 1    |
| 5   | Fix Navigation Stack TODO         | P0       | ⬜     | 1    |
| 6   | Decompose PredictMarketDetails    | P0       | ⬜     | 2    |
| 7   | Decompose PredictFeed             | P0       | ⬜     | 2    |
| 8   | Extract Controller Error Handling | P0       | ⬜     | 2    |
| 9   | Consolidate Toast Hooks           | P1       | ⬜     | 2    |
| 10  | Migrate PredictMarketOutcome      | P1       | ⬜     | 3    |
| 11  | Migrate PredictMarketSingle       | P1       | ⬜     | 3    |
| 12  | Migrate PredictPosition           | P1       | ⬜     | 3    |
| 13  | Migrate PredictPositionEmpty      | P1       | ⬜     | 3    |
| 14  | Migrate PredictPositionResolved   | P1       | ⬜     | 3    |
| 15  | Migrate PredictOffline            | P1       | ⬜     | 3    |
| 16  | Migrate PredictGTMModal           | P1       | ⬜     | 3    |
| 17  | Migrate PredictMarketRowItem      | P1       | ⬜     | 3    |
| 18  | Migrate PredictMarketMultiple     | P1       | ⬜     | 3    |
| 19  | Migrate PredictSellPreview        | P1       | ⬜     | 3    |
| 20  | Consolidate Chart Types           | P1       | ⬜     | 3    |
| 21  | Add Memoization                   | P1       | ⬜     | 3    |
| 22  | Fix Prop Drilling                 | P1       | ⬜     | 3    |
| 23  | Tests for PredictMarketRowItem    | P2       | ⬜     | 4    |
| 24  | Tests for Chart Subcomponents     | P2       | ⬜     | 4    |
| 25  | Update README                     | P2       | ⬜     | 4    |
| 26  | Archive Outdated Docs             | P2       | ⬜     | 4    |

---

## Related Documents

- [Architecture Overview](./architecture-overview.md) - Current vs target architecture
- [Implementation Guide](./implementation-guide.md) - Patterns and anti-patterns
- [Live NFL Architecture](./live-nfl-architecture.md) - Sports feature specifics
