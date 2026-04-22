# Plan: Migrate QuickBuyBottomSheet Away from Bridge Redux State Slice

## Context

`QuickBuyBottomSheet` currently reuses the full Bridge/Swaps Redux machinery — it dispatches into the bridge state slice (`setSourceToken`, `setDestToken`, `setSourceAmount`, etc.), reads back quotes via polling hooks (`useBridgeQuoteRequest` + `useBridgeQuoteData`), and resets the entire bridge state on unmount (`resetBridgeState()`). This creates tight coupling to the bridge state slice, causes reselect stability warnings, and makes it hard to reason about state isolation for the social leaderboard feature.

The goal is to replace the bridge Redux state slice dependency with a direct, one-shot call to `BridgeController:fetchQuotes` (the same imperative API `TransactionPayController` uses for `perpsDeposit` transactions), and manage all quote/UI state locally inside the hook.

---

## What QuickBuy Currently Reads / Writes to the Bridge Redux Slice

### Reads (selectors):

| Selector                                                                                                                                                                                        | Purpose                                                                 |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `selectIsSubmittingTx`                                                                                                                                                                          | Gate confirm button; disable sheet interactivity                        |
| `selectDestAddress`                                                                                                                                                                             | Detect missing cross-ecosystem destination address                      |
| `selectIsEvmNonEvmBridge` / `selectIsNonEvmNonEvmBridge`                                                                                                                                        | Determine if dest address picker is needed                              |
| `selectIsBridgeEnabledSourceFactory`                                                                                                                                                            | Validate dest chain is bridge-enabled                                   |
| `selectSourceToken`, `selectDestToken`, `selectSourceAmount`, `selectSlippage`, `selectSelectedDestChainId`                                                                                     | Passed through to `useBridgeQuoteRequest`                               |
| `selectBridgeQuotes`, `selectBridgeControllerState`, `selectBridgeFeatureFlags`, `selectQuoteStreamComplete`, `selectSelectedQuoteRequestId`, `selectIsSolanaSwap`, `selectIsSolanaToNonSolana` | All consumed by `useBridgeQuoteData`                                    |
| `selectIsGasIncludedSTXSendBundleSupported`, `selectIsGasIncluded7702Supported`                                                                                                                 | Passed to `selectGasIncludedQuoteParams` inside `useBridgeQuoteRequest` |
| `selectIsSwap`, `selectIsBridge`, `selectIsEvmSwap`                                                                                                                                             | Used by `useInitialSlippage`                                            |
| `selectAbTestContext`                                                                                                                                                                           | Used by `useSubmitBridgeTx` for analytics attribution                   |

### Dispatches (writes):

| Action                                   | When                                                     |
| ---------------------------------------- | -------------------------------------------------------- |
| `setSourceToken`                         | When selected source token / destToken changes           |
| `setDestToken`                           | Same; also sets `selectedDestChainId`                    |
| `setSourceAmount`                        | Every time `usdAmount` changes                           |
| `setIsSubmittingTx`                      | Wraps `submitBridgeTx` call                              |
| `resetBridgeState`                       | On unmount                                               |
| `setSlippage`                            | Via `useInitialSlippage` on mount                        |
| `setDestAddress`                         | Via `useRecipientInitialization` on mount                |
| `setIsGasIncludedSTXSendBundleSupported` | Via `useIsGasIncludedSTXSendBundleSupported` hook        |
| `setSelectedQuoteRequestId` (reset)      | When manual selection goes stale in `useBridgeQuoteData` |

---

## The `fetchQuotes` API (Target)

`BridgeController:fetchQuotes` is a one-shot imperative call (no polling, no Redux writes):

```ts
Engine.controllerMessenger.call(
  'BridgeController:fetchQuotes',
  quoteRequest: GenericQuoteRequest,
  abortSignal?: AbortSignal | null,
  featureId?: FeatureId | null,  // FeatureId.PERPS = "perps"
): Promise<(QuoteResponse & L1GasFees & NonEvmFees)[]>
```

`GenericQuoteRequest` requires: `walletAddress`, `srcChainId`, `destChainId`, `srcTokenAddress`, `destTokenAddress`, `srcTokenAmount` (atomic string), `gasIncluded`, `gasIncluded7702`, `slippage`.

---

## Migration Approach

### 1. New `useQuickBuyQuotes` hook (replaces `useBridgeQuoteRequest` + `useBridgeQuoteData`)

Manage locally:

- `quotes: QuoteResponse[]` (local `useState`)
- `isQuoteLoading: boolean`
- `quoteFetchError: string | null`
- A `useEffect` with debounce (300–500ms) + `AbortController` that calls `BridgeController:fetchQuotes` whenever `srcTokenAmount`, `sourceToken`, `destToken`, or `slippage` changes
- Best-quote selection: take `quotes[0]` or implement "fastest 3 → cheapest among those meeting minimum" (same as `TransactionPayController`)
- Derive `isNoQuotesAvailable`, `blockaidError` (if needed) from the response

### 2. Replace bridge slice reads with local state

| Was (bridge Redux slice)       | Becomes (local state / pure derivation)                                                 |
| ------------------------------ | --------------------------------------------------------------------------------------- |
| `selectIsSubmittingTx`         | `const [isSubmittingTx, setIsSubmittingTx] = useState(false)`                           |
| `selectSlippage`               | `const [slippage, setSlippage] = useState('0.5')`                                       |
| `selectDestAddress`            | Derive locally from `useInternalAccounts()` filtered by dest chain                      |
| `selectIsEvmNonEvmBridge`      | Pure function: `srcChainId !== destChainId && isEvm(srcChainId) !== isEvm(destChainId)` |
| `selectIsNonEvmNonEvmBridge`   | Same pattern                                                                            |
| `selectGasIncludedQuoteParams` | Call Engine APIs directly; store result in `useRef` or local state                      |

### 3. Keep the following hooks as-is (they do NOT depend on bridge Redux slice writes):

- `useQuickBuySetup` — reads `selectIsBridgeEnabledSourceFactory` (read-only from `BridgeController` background state; no writes needed)
- `useSourceTokenOptions` — reads from `AccountTrackerController`, `TokenBalancesController`, `TokenRatesController`, etc.
- `useLatestBalance` — fetches live on-chain balance; no bridge slice dependency
- `useIsInsufficientBalance` — adapt to accept the locally-held `activeQuote` instead of reading from `selectBridgeQuotes`
- `useHasSufficientGas` — already reads gas fee from the quote directly; adapt to accept local quote
- `useRewards` — currently reads `selectSourceToken`, `selectDestToken`, `selectSourceAmount` from Redux; refactor signature to accept these as parameters

### 4. `useSubmitBridgeTx` — adapt or inline

`useSubmitBridgeTx` reads `selectAbTestContext` from the bridge Redux slice (for analytics). Two options:

- **Option A (simpler)**: Strip `abTestContext` from the analytics payload for QuickBuy, or derive from a separate source. Keep the rest of `useSubmitBridgeTx` unchanged — `BridgeStatusController.submitTx(...)` doesn't depend on bridge Redux state.
- **Option B**: Inline the submit logic (call `Engine.context.BridgeStatusController.submitTx(walletAddress, activeQuote, stxEnabled, ...)`) directly, bypassing `useSubmitBridgeTx` entirely.

**Recommendation**: Option A — keep `useSubmitBridgeTx` but accept that `abTestContext` will be `undefined` for the QuickBuy flow (or pass an empty `{}`).

### 5. Remove all bridge slice dispatches from `useQuickBuyBottomSheet`

Delete: `setSourceToken`, `setDestToken`, `setSourceAmount`, `setIsSubmittingTx`, `resetBridgeState`, and the cleanup effect that called `Engine.context.BridgeController.resetState()`. The `AbortController` in the new quotes hook handles cleanup instead.

### 6. Remove bridge-infrastructure hooks from `useQuickBuyBottomSheet`

Remove from import/usage:

- `useBridgeQuoteRequest`
- `useBridgeQuoteData`
- `useInitialSlippage` (replaced by `useState`)
- `useRecipientInitialization` (replaced by local derivation)
- `useIsGasIncludedSTXSendBundleSupported` (call Engine directly in the new quotes hook)
- `useUnifiedSwapBridgeContext` (analytics context for quote request; can be simplified or removed)

---

## Files to Modify

| File                                                  | Change                                                                                                          |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `QuickBuyBottomSheet/useQuickBuyBottomSheet.ts`       | Major rewrite: remove all bridge slice dispatches/selectors; manage state locally; call new `useQuickBuyQuotes` |
| `QuickBuyBottomSheet/useQuickBuyQuotes.ts` (new file) | New hook: calls `BridgeController:fetchQuotes` with debounce + AbortController                                  |
| `QuickBuyBottomSheet/useRewards.ts` (if local copy)   | Refactor to accept token params directly instead of reading Redux                                               |
| `QuickBuyBottomSheet/QuickBuyBottomSheet.tsx`         | Remove `selectIsSubmittingTx` import; accept `isSubmittingTx` from inner hook or local prop                     |

Files that should **not** need changes:

- `useQuickBuySetup.ts` — already reads-only (no bridge slice writes)
- `useSourceTokenOptions.ts` — no bridge slice dependency
- `QuickBuyAmountInput.tsx`, `QuickBuyHeader.tsx`, `QuickBuyFooter.tsx` — receive all state as props

---

## Effort Estimate

| Work Item                                                                      | Effort |
| ------------------------------------------------------------------------------ | ------ |
| Write `useQuickBuyQuotes` (fetch + debounce + abort + best-quote selection)    | ~4h    |
| Rewrite `useQuickBuyBottomSheet` (remove Redux writes; wire local state)       | ~6h    |
| Adapt `useIsInsufficientBalance` + `useHasSufficientGas` to accept local quote | ~1h    |
| Adapt `useRewards` to accept token params directly                             | ~1h    |
| Handle `useSubmitBridgeTx` / `abTestContext`                                   | ~1h    |
| Unit tests for new `useQuickBuyQuotes` + updated `useQuickBuyBottomSheet`      | ~4h    |
| Manual QA (happy path + error states + unsupported chain)                      | ~2h    |

**Total estimate: ~19h (~2.5 days)**

---

## Alternative (Short-Term): Keep Redux Slice, Replace Only Quote Fetching

Replace `useBridgeQuoteRequest` + `useBridgeQuoteData` with a single `useQuickBuyQuotes` hook that calls `fetchQuotes` directly. Keep everything else unchanged.

### What stays the same:

- All Redux dispatches (`setSourceToken`, `setDestToken`, `setSourceAmount`, `resetBridgeState`, `setIsSubmittingTx`)
- All infrastructure hooks (`useInitialSlippage`, `useRecipientInitialization`, `useIsGasIncludedSTXSendBundleSupported`)
- All Redux selector reads (`selectIsSubmittingTx`, `selectDestAddress`, `selectIsEvmNonEvmBridge`, etc.)
- `useSubmitBridgeTx` unchanged

### What changes:

- New `useQuickBuyQuotes` hook: debounce + `AbortController` + `Engine.context.BridgeController.fetchQuotes(...)` — returns `{ activeQuote, isQuoteLoading, quoteFetchError, isNoQuotesAvailable }` from local `useState`
- `useIsInsufficientBalance` + `useHasSufficientGas` adapt to receive `activeQuote` from local state instead of `selectBridgeQuotes`
- No polling loop is ever started; the `BridgeController` quote state stays empty

### Files to modify (short-term):

| File                              | Change                                                                                                                                             |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useQuickBuyBottomSheet.ts`       | Swap out `useBridgeQuoteRequest` + `useBridgeQuoteData` calls for new `useQuickBuyQuotes`; thread `activeQuote` into insufficientBalance/gas hooks |
| `useQuickBuyQuotes.ts` (new file) | Debounced `fetchQuotes` call with `AbortController`; local loading/error state; best-quote selection                                               |

### Effort estimate (short-term):

| Work Item                                                | Effort |
| -------------------------------------------------------- | ------ |
| Write `useQuickBuyQuotes`                                | ~4h    |
| Update `useQuickBuyBottomSheet` to wire new hook         | ~2h    |
| Adapt `useIsInsufficientBalance` + `useHasSufficientGas` | ~1h    |
| Unit tests                                               | ~2h    |
| Manual QA                                                | ~2h    |

**Total: ~11h (~1.5 days)** — roughly half the full migration effort.

---

## Key Risks / Open Questions

1. **No polling**: `fetchQuotes` is one-shot. The current bridge flow refreshes quotes every ~10s. For QuickBuy, should we re-fetch on a timer? Or only re-fetch when the user changes the amount? (Recommend: re-fetch on amount change + stale timeout of ~30s to avoid showing expired quotes at confirm time.)

2. **`fetchQuotes` is a public `BridgeController` method** — `Engine.context.BridgeController.fetchQuotes(quoteRequest, abortSignal, featureId)` works directly from any hook. No messenger routing needed. `FeatureId` is also publicly exported from `@metamask/bridge-controller` (`FeatureId.PERPS = "perps"`).

3. **`selectIsBridgeEnabledSourceFactory`**: This is a read-only selector that reads from `BridgeController` background state (no slice writes needed). It can stay as-is — keeping it does NOT re-introduce bridge slice write dependencies.

4. **Blockaid validation**: `useBridgeQuoteData` validates quotes against Blockaid. QuickBuy currently shows a `blockaidError`. This validation logic would need to be ported or simplified in the new hook.

---

## Verification

1. Run `yarn jest app/components/Views/SocialLeaderboard` to verify unit tests pass
2. Manual smoke test on simulator:
   - Open QuickBuy sheet → skeleton → content loads
   - Enter USD amount → quote fetches (loading spinner) → estimated receive shown
   - Change source token → new quote fetches
   - Tap Confirm → tx submits, sheet closes
   - Open Bridge/Swaps screen → verify its state is clean (not polluted by QuickBuy)
3. Verify `BridgeController.state` is not mutated during QuickBuy usage (add a test that checks BridgeController state before/after opening QuickBuy)
