## Summary

When navigating to a market with an open position, the green/red Long/Short buttons briefly flashed before being replaced by the correct Modify/Close buttons. The root cause was a one-render gap in `usePerpsLivePositions` where `isInitialLoading` became `false` but `positions` was still empty because it was updated through an async `useEffect` pipeline. Fixed by replacing the `useEffect`+`setState` pattern with `useMemo` for synchronous derived state.

## Root cause

**File:** `app/components/UI/Perps/hooks/stream/usePerpsLivePositions.ts:117-128`

The hook maintained two separate state variables: `rawPositions` (updated by WebSocket callback) and `positions` (derived from `rawPositions` via a `useEffect` that called `setPositions`). When the WebSocket callback fired, it batched `setIsInitialLoading(false)` + `setRawPositions(data)` in the same render. However, the `useEffect` that synced `rawPositions` → `positions` ran *after* that render, creating an intermediate render where:
- `isInitialLoading = false` (buttons visible)
- `positions = []` (not yet synced)
- `existingPosition = null` → Long/Short buttons shown

## Reproduction commit

SHA: `3bf4a69e53` — `debug(pr-27668): add reproduction marker`

Metro log excerpt:
```
(NOBRIDGE) DEBUG  [PR-27668] BUG_MARKER: buttons visible but no existingPosition — Long/Short flash {"asset": "BTC", "existingPosition": "null", "isLoadingPosition": false}
```

## Changes

| File | Change |
|------|--------|
| `app/components/UI/Perps/hooks/stream/usePerpsLivePositions.ts` | Replace `positions` state + enrichment `useEffect` with `useMemo` for synchronous derived state |
| `app/components/UI/Perps/hooks/stream/useLivePositions.test.ts` | Add test verifying no intermediate render with `isInitialLoading=false` + empty positions |

## Test plan

### Automated
- TypeScript: `yarn lint:tsc` — no new errors
- Unit tests: `yarn jest useLivePositions.test.ts` — 32/32 pass (including new TAT-2236 test)
- Recipe: `validate-recipe.sh automation/27668/` — 7/7 pass, BUG_MARKER absent

### Manual (Gherkin)
```gherkin
Given the user has an open BTC position
When the user navigates to the BTC market detail
Then Modify/Close buttons appear immediately without any Long/Short flash

Given the user has no open position for ETH
When the user navigates to the ETH market detail
Then Long/Short buttons appear immediately without any flash
```

## Evidence

- `automation/27668/before.mp4` — shows Long/Short button color flash on navigation
- `automation/27668/after.mp4` — shows clean Modify/Close button rendering
- `automation/27668/market-detail-with-position.png` — screenshot from recipe validation

## JIRA

TAT-2236
