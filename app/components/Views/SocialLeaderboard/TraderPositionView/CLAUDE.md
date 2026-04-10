# QuickBuy — Technical Implementation Guide

## Overview

QuickBuy is a simplified token purchase flow embedded in the Social Trading feature. It lets users buy tokens directly from a trader's position view via a bottom sheet, without navigating to the full Bridge/Swaps page. Under the hood it reuses the existing Bridge/Swaps infrastructure to execute cross-chain bridge+swap transactions.

## File Structure

```
app/components/Views/SocialLeaderboard/
  TraderPositionView/
    TraderPositionView.tsx         — Main screen (chart, position card, trade history, Buy button)
    TraderPositionView.testIds.ts  — Test ID constants
    index.ts                       — Barrel export
    components/
      QuickBuyBottomSheet/
        QuickBuyBottomSheet.tsx    — Bottom sheet UI + bridge lifecycle orchestration
        useQuickBuySetup.ts        — Resolves Position → BridgeToken objects
        useSourceTokenOptions.ts   — Builds "Pay with" options from cached balances
        sourceTokenCandidates.ts   — Curated native + stablecoin candidate list
        SourceTokenPicker.tsx      — Inline source token picker rendered inside the sheet
        index.ts                   — Barrel export
  utils/
    chainMapping.ts               — Maps social API chain names to hex/CAIP chain IDs
```

## Data Gap: Position vs BridgeToken

The social API's `Position` type provides `tokenSymbol`, `tokenName`, `tokenAddress`, and `chain` (a human-readable string like `"base"`). The Bridge system requires `BridgeToken` objects with `decimals`, `image`, and a hex/CAIP `chainId`. The `useQuickBuySetup` hook bridges this gap.

## Core Data Flow

### 1. Chain Resolution

`chainNameToId()` in `utils/chainMapping.ts` maps social API chain names to the format the Bridge system expects:

| Social API | Chain ID                                  |
| ---------- | ----------------------------------------- |
| `ethereum` | `0x1`                                     |
| `base`     | `0x2105`                                  |
| `arbitrum` | `0xa4b1`                                  |
| `optimism` | `0xa`                                     |
| `polygon`  | `0x89`                                    |
| `linea`    | `0xe708`                                  |
| `bsc`      | `0x38`                                    |
| `solana`   | `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` |

If the chain is not in this map, `isUnsupportedChain` is set and the sheet shows a message instead of the buy flow.

### 2. Token Resolution

**Source token options** — resolved by `useSourceTokenOptions()`:

- Candidate list comes from `sourceTokenCandidates.ts`
- Includes curated EVM stablecoins (`mUSD`, `USDC`, `USDT`) plus native tokens on major EVM chains
- Native balances are read from `AccountTrackerController`
- ERC-20 balances are read from `TokenBalancesController`
- Address lookups are checksum-aware, so the hook can read balances regardless of how the controller stored the address casing
- Options are sorted by fiat value descending, and `QuickBuyBottomSheet` auto-selects the top option on first load
- There is no multi-token RPC fallback in this hook; if a token is not present in cached Redux balance state, it is not shown as an option

**Destination token** — the token the trader holds:

- Metadata (decimals, image) fetched via `useAssetMetadata` hook, which calls the Token Metadata API (`tokens.api.cx.metamask.io/v3/assets`)
- This API has broader coverage than `TokenListController`, which only contains curated/verified tokens and would miss the micro-cap tokens social traders typically hold
- Address comes from `position.tokenAddress`; for non-EVM chains, the CAIP reference from the metadata response is used instead

### 3. Token Icons

- **Dest token icon** (header): `useAssetMetadata` returns an image URL via `getAssetImageUrl()`, which constructs `https://static.cx.metamask.io/api/v2/tokenIcons/assets/{caipPath}.png`
- **Dest token icon** (TraderPositionView token info row): Same URL constructed statically via `getAssetImageUrl(tokenAddress, chainId)`
- **Source token icon** ("Pay with" row / picker): Uses the selected or listed `BridgeToken.image`, wrapped in a `BadgeWrapper` + `BadgeNetwork` to show the token network
- **Network badge**: `getNetworkImageSource({ chainId })` resolves to a bundled local asset

## Bridge/Swaps Integration

QuickBuy reuses the existing Bridge system by writing to the shared bridge Redux slice and reading from the same hooks the full Bridge page uses.

### Redux State (bridge slice)

**Actions dispatched:**
| Action | When | Purpose |
|---|---|---|
| `setSourceToken` | On mount, when tokens resolve | Populates source token for quote system |
| `setDestToken` | On mount, when tokens resolve | Populates dest token and auto-sets `selectedDestChainId` |
| `setSourceAmount` | When user changes USD amount | Converted from USD via exchange rate |
| `setIsSubmittingTx` | During tx submission | Controls button loading state and prevents sheet dismissal |
| `resetBridgeState` | On unmount | Clears all bridge state to prevent leakage |

**Selectors read:**
| Selector | Source | Purpose |
|---|---|---|
| `selectIsSubmittingTx` | bridge slice | Button loading state |
| `selectSourceWalletAddress` | `app/selectors/bridge.ts` | Wallet address for the source chain; derived from `selectSourceToken.chainId` via `selectSelectedInternalAccountByScope` |
| `selectSelectedInternalAccountByScope` | multichain account selectors | EVM address used by `useSourceTokenOptions` for cached balance lookups |
| `selectAccountsByChainId` | accountTrackerController | Cached native balances for source token candidates |
| `selectTokensBalances` | tokenBalancesController | Cached ERC-20 balances for source token candidates |

### Hooks Used

**Source token discovery:**
| Hook | Purpose |
|---|---|
| `useSourceTokenOptions` | Builds the "Pay with" option list from cached Redux balances and sorts it by fiat value |
| `SourceTokenPicker` | Inline picker UI that lets the user switch between the resolved source token options |

**Quote lifecycle:**
| Hook | Purpose |
|---|---|
| `useBridgeQuoteRequest` | Sends debounced quote requests to `BridgeController.updateBridgeQuoteRequestParams()`. Guards on `walletAddress` — returns early if undefined. |
| `useBridgeQuoteData` | Reads quotes from `BridgeController` state; manages refresh/expiration (30s default). Returns `activeQuote`, `isLoading`, `isNoQuotesAvailable`, `quoteFetchError`, `blockaidError`. |

**Balance & validation:**
| Hook | Purpose |
|---|---|
| `useLatestBalance` | Fetches real-time source balance via on-chain RPC (`web3Provider.getBalance` for native, `tokenContract.balanceOf` for ERC-20). Falls back to cached balance from the `balance` prop while the RPC call is in-flight. |
| `useIsInsufficientBalance` | Compares `sourceTokenAmount` against `latestAtomicBalance` |
| `useHasSufficientGas` | Validates gas affordability against the active quote's estimated gas |

**Smart Transactions (STX):**
| Hook | Purpose |
|---|---|
| `useRefreshSmartTransactionsLiveness` | Fetches STX relayer liveness for the source chain. Required for determining if bundled approval+swap is available. |
| `useIsGasIncludedSTXSendBundleSupported` | Checks if the chain supports gas-included STX `sendBundle`. Sets `isGasIncludedSTXSendBundleSupported` in Redux, which `useBridgeQuoteRequest` reads to include `gasIncluded` in quote params. |

**Other:**
| Hook | Purpose |
|---|---|
| `useInitialSlippage` | Sets per-chain default slippage in Redux if not already set |
| `useSubmitBridgeTx` | Submits the approved tx via `BridgeStatusController.submitTx()` |

### Controller Interactions

| Controller               | Method                             | When                                              |
| ------------------------ | ---------------------------------- | ------------------------------------------------- |
| `BridgeController`       | `updateBridgeQuoteRequestParams()` | Via `useBridgeQuoteRequest` when inputs are valid |
| `BridgeController`       | `resetState()`                     | On sheet unmount                                  |
| `BridgeStatusController` | `submitTx()`                       | Via `useSubmitBridgeTx` when user confirms        |

## USD Amount Input

The user enters a USD amount via preset buttons (`$1`, `$20`, `$50`, `$100`) or a hidden `TextInput` (triggered by tapping the amount area). The conversion to source token amount:

```
sourceTokenAmount = usdAmount / sourceToken.currencyExchangeRate
```

This is dispatched to Redux via `setSourceAmount`, which triggers the quote request.

## Transaction Submission

When the user taps "Buy":

1. `setIsSubmittingTx(true)` — disables the button and prevents sheet dismissal (`isInteractable={false}`)
2. `submitBridgeTx({ quoteResponse: activeQuote })` — submits via BridgeStatusController
   - **EVM + STX**: Bundled approval + swap in a single transaction
   - **EVM without STX**: Two transactions (approval, then swap)
   - **Solana**: Single transaction (no approval model)
3. On success: close sheet, navigate to `Routes.TRANSACTIONS_VIEW`
4. On error: sheet stays open for retry
5. `setIsSubmittingTx(false)` in `finally`

## Button State Logic

The confirm button is disabled when any of these conditions is true:

| Condition                                | Label shown                 |
| ---------------------------------------- | --------------------------- |
| No amount entered                        | "Buy" (disabled)            |
| Setup loading (metadata fetch)           | "Loading..."                |
| Quote loading (no cached quote)          | "Buy" (loading spinner)     |
| Insufficient balance                     | "Insufficient funds"        |
| Insufficient gas                         | "Insufficient gas"          |
| Submitting transaction                   | "Submitting transaction..." |
| Quote error / no quotes / blockaid error | "Unavailable"               |
| No wallet address                        | "Buy" (disabled)            |

## Architectural Decisions

### Shared Redux Slice (not local state)

QuickBuy writes to the same bridge Redux slice that the full Bridge page uses. This enables zero-duplication reuse of all bridge hooks. The tradeoff is state collision risk — mitigated by:

- `resetBridgeState()` + `BridgeController.resetState()` on unmount
- The outer wrapper (`QuickBuyBottomSheet`) returns `null` when `!isVisible`, preventing hooks from running on stale state

### Curated Multi-Chain Source Candidates

QuickBuy no longer hardcodes mainnet ETH as the only source. Instead it offers a curated set of source tokens and lets the user select from the non-zero balances already present in Redux. This was chosen because:

- It keeps the UI simple while still exposing common funding assets (`mUSD`, `USDC`, `USDT`, native gas tokens)
- It avoids opening the full Bridge token selector flow inside the sheet
- It keeps option resolution synchronous and predictable by using cached controller state only

### Token Metadata API (not TokenListController)

Social traders often hold micro-cap or newly deployed tokens that aren't in the curated `TokenListController` list. The Token Metadata API (`tokens.api.cx.metamask.io/v3/assets`) has broader coverage and also returns the image URL.

## Limitations & Open Questions

### Candidate list is curated

The source token list is not open-ended. It is limited to the static candidates in `sourceTokenCandidates.ts`: native tokens on major EVM chains and a curated set of stablecoins (`mUSD`, `USDC`, `USDT`). If the user holds another tradable asset, it will not appear here unless the candidate list is expanded.

### Redux-only source balances

`useSourceTokenOptions` intentionally reads cached balances from Redux only. If a balance has not been populated yet in `AccountTrackerController` or `TokenBalancesController`, the token will not appear in the picker until the controllers update.

### Concurrent Bridge state access

If the user somehow navigates to the full Bridge/Swaps page while QuickBuy is open (or vice versa), the shared Redux state would be overwritten. There is no explicit guard preventing this — it relies on the navigation flow making it unlikely.

### Quote expiration UX

`useBridgeQuoteData` auto-refreshes quotes, but there is no explicit "quote expired" indicator or manual refresh button in the QuickBuy UI. If the refresh fails silently, the user may see stale quote data.

### Solana: no Blockaid validation

The design doc (Section 7.8) notes that `useValidateBridgeTx()` should be called for Solana swaps to check for malicious transactions. The current implementation does not call this hook. For now the source chain is always EVM (mainnet), so this is not triggered, but it would need attention if Solana source support is added.

### Points estimation

The "Est. points" row is hardcoded to `0`. There is no integration with a points/rewards system yet.

### TraderPositionView uses mock data

The main screen (chart placeholder, position card, trade history) uses hardcoded mock data (`MOCK_TOKEN`, `MOCK_POSITION`, `MOCK_TRADES`). Only the QuickBuy flow uses real data from the `Position` route parameter.

### Error feedback is minimal

Transaction submission failures are caught but not surfaced to the user — the sheet stays open with no error message. A toast or inline error would improve the UX.

### No analytics/metrics

The design doc mentions defining a `MetaMetricsSwapsEventSource` for QuickBuy, and `useBridgeQuoteEvents` needs an analytics `location` param. Neither is implemented yet.

## Key Patterns & Gotchas for Future Work

### Bottom sheet visibility gate

`QuickBuyBottomSheet` is split into an outer wrapper that returns `null` when `!isVisible`, and an inner component that contains all hooks. This prevents bridge hooks from running against empty Redux state and causing reselect warnings. **Do not merge these into a single component.**

### Bridge Redux lifecycle

The bridge slice is shared global state. Any code that writes to it (`setSourceToken`, `setDestToken`, etc.) **must** call `resetBridgeState()` and `Engine.context.BridgeController.resetState()` on cleanup. Forgetting this leaks state into subsequent Bridge page visits.

### selectSourceWalletAddress depends on setSourceToken

`selectSourceWalletAddress` returns `undefined` until `setSourceToken` is dispatched (it derives the wallet address from `sourceToken.chainId`). This means `useBridgeQuoteRequest` will silently skip quote fetching until the source token is in Redux. If you see quotes not loading, check this dependency chain.

### useLatestBalance does RPC fetching

`useLatestBalance` is not a pure Redux selector — it makes on-chain RPC calls via `web3Provider.getBalance()`. The `balance` prop passed to it serves as a cached fallback displayed while the RPC call resolves. If the cached value is `'0.0'` (e.g., from a chain where the user has no funds), that's what shows until RPC completes.

### useSourceTokenOptions is Redux-only

Unlike `useLatestBalance`, `useSourceTokenOptions` does not perform RPC balance discovery. It only uses cached Redux balances, but it does normalize address casing for both account and token keys when reading controller state.

### Design system migration

Token avatars use `AvatarToken` from `@metamask/design-system-react-native` (not the deprecated `component-library` version). The design system version uses `src` prop (not `imageSource`) and `AvatarTokenSize` (not `AvatarSize`). `BadgeWrapper` and `BadgeNetwork` still come from `component-library` as they haven't been migrated yet.

### Chain mapping is manually maintained

`utils/chainMapping.ts` is a hardcoded map. If the social API adds new chains, this map must be updated or positions on those chains will show as "unsupported". The `isSupportedChain()` helper can be used to check before attempting resolution.
