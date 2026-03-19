# TAT-2236: Button color flash when open a market with an open position

## Summary

When navigating to a market with an open position, Long/Short buttons briefly flashed before switching to Close/Modify buttons. The root cause was a `useEffect`-based derived state in `usePerpsLivePositions` that lagged one render behind, causing an intermediate render where loading was complete but positions were still empty. Fixed by replacing the `useEffect` with `useMemo` for synchronous position enrichment.

## Root Cause

**File:** `app/components/UI/Perps/hooks/stream/usePerpsLivePositions.ts:117-128`

The `positions` state was derived from `rawPositions` via a `useEffect`, which runs after render. When the WebSocket subscription callback fired, React batched `setIsInitialLoading(false)` + `setRawPositions(newData)`, but the derived `positions` state (set via `useEffect`) only updated on the NEXT render. This created an intermediate render where:
- `isInitialLoading` = false (buttons visible)
- `positions` = [] (still stale from previous render)
- `existingPosition` = null → Long/Short buttons shown instead of Close/Modify

## Reproduction Commit

SHA: `d19c3c7a71` — `debug(pr-27669): add reproduction marker`

Metro log excerpt proving the bug:
```
(NOBRIDGE) DEBUG  [PR-27669] BUG_MARKER: Long/Short buttons shown without position confirmation {"existingPosition": false, "hasLongShortButtons": true, "isLoadingPosition": false}
```

## Changes

| File | Description |
|------|-------------|
| `app/components/UI/Perps/hooks/stream/usePerpsLivePositions.ts` | Replace `useEffect` with `useMemo` for position enrichment — positions now computed synchronously during render |
| `app/components/UI/Perps/hooks/stream/useLivePositions.test.ts` | Add test verifying positions and loading state update atomically (no intermediate empty-positions render) |

## Test Plan

### Automated
- **Type check:** `yarn lint:tsc` — no new errors (pre-existing Bridge/ProfileMetrics errors only)
- **Unit tests:** 32/32 pass in `useLivePositions.test.ts` (including new TAT-2236 atomicity test)
- **Coverage:** 100% lines, 100% statements, 89.74% branches on changed file
- **Recipe:** `validate-recipe.sh automation/27669/ --skip-manual` — 7/7 steps pass

### Manual (Gherkin)
```gherkin
Feature: Perps market detail action buttons
  Scenario: Market with open position shows correct buttons immediately
    Given user has an open BTC position
    When user navigates to BTC market detail
    Then Close/Modify buttons appear immediately
    And Long/Short buttons are never visible

  Scenario: Market without position shows Long/Short immediately
    Given user has no open SOL position
    When user navigates to SOL market detail
    Then Long/Short buttons appear after loading
    And Close/Modify buttons are never visible
```

## Evidence

- `automation/27669/before.mp4` — shows button flash (Long/Short briefly visible before Close/Modify)
- `automation/27669/after.mp4` — shows fix (Close/Modify appear directly, no flash)
- `automation/27669/2026-03-19_153903_btc-market-with-position.png` — screenshot of correct button state

## JIRA

TAT-2236
