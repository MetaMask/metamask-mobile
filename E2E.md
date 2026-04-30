# E2E Failures Snapshot

- **PR**: [#29511](https://github.com/MetaMask/metamask-mobile/pull/29511)
- **Workflow run**: `25165375734`
- **Branch**: `chore/build-e2e-rn-update-81`
- **Commit**: `c510a48d` (fix(ios): expose rootViewFactory KVC accessor)

## Progress vs previous run

| | Run `510259b1` | Run `c510a48d` |
|---|---:|---:|
| **Unique failing tests** | 108 | **95** (-13) |
| `detox-tap-failed` | 59 | **27** (-32) — most were app crashes misreported, fixed by Sentry mock |
| `port-collision` | 10 | **0** — flaky CI infra resolved |
| `anvil-crashed` | 1 | **0** |
| `detox-element-not-found` | 13 | **28** (+15) — real selector misses now visible |
| `detox-assertion-retry-exhausted` | 6 | **18** (+12) — real visibility issues now visible |
| `fixture-cleanup-failure` | 5 | 4 |
| `jest-test-timeout` | 5 | 1 |
| `detox-retry-exhausted` | 9 | 9 |
| `other` | — | 8 |

The `(-)` deltas in `detox-tap-failed`/`port-collision`/`anvil-crashed` were all **silent app crashes masked by the broken ErrorBoundary**. The `(+)` deltas in `element-not-found`/`assertion-retry-exhausted` are **real product/test failures that were previously hidden** behind the cascading mock crash.

## Triage progress

| # | Target | Status | Detail |
|---|---|---|---|
| 1 | `seedless-onboarding-*` ErrorBoundary cascade | ✅ **Fixed** (`883e34b7`) | Added `lastEventId` + `withScope` to E2E Sentry mock. Cascade gone. |
| 1b | Detox `device.reloadReactNative()` (`rootViewFactory` NPE) | ✅ **Fixed** (`c510a48d`) | Forwarding `@objc var rootViewFactory` accessor on AppDelegate. Inter-test reload now works. |
| 2 | `seedless-onboarding-*` real OAuth-flow regression | 🔍 **Investigating** | App now launches and gets through OnboardingSheet → tap Google/Apple → **next screen never appears**. 9 Android + 8 iOS tests stuck at: `Account Already Exists screen should be visible` (4 existing-user tests) or `Password creation screen should be visible` (5 new-user tests). Same symptom on both platforms → not selector-rename, looks like real OAuth navigation regression in RN 0.81 path. |
| 3 | `confirmations-android-smoke-*` (16 tests) | ⏭️ Pending |  |
| 4 | `network-abstraction-*` and `network-expansion-*` (12 tests) | ⏭️ Pending |  |
| 5 | `prediction-market-*` (5 tests) | ⏭️ Pending |  |
| 6 | `ramps-*` (4 tests) | ⏭️ Pending |  |
| 7 | `snaps-android-smoke-*` (16 tests) | ⏭️ Pending — iOS now passes, Android-only |  |
| 8 | `trade-*-smoke-1` (Android + iOS, 7 tests each) | ⏭️ Pending |  |

Total unique failing tests: **95**

## Failure categories

| Category | Count | Likely root cause |
|---|---|---|
| `detox-element-not-found` | 28 | Matcher never matches — selector changed or element renamed/removed. |
| `detox-tap-failed` | 27 | Element exists but is not tappable (covered/animated/offscreen). UI changes from RN 0.81 upgrade likely cover the tested elements. |
| `detox-assertion-retry-exhausted` | 18 | Assertion never became true within the retry budget. |
| `detox-retry-exhausted` | 9 | Generic Detox retry budget exhausted on a non-tap action. |
| `other` | 8 | Unclassified |
| `fixture-cleanup-failure` | 4 | Test cleanup helper threw — usually a downstream effect of the test body failing. |
| `jest-test-timeout` | 1 | Test exceeded global jest timeout (300s) — usually means the test hung waiting for an event. |

## Per-job summary

| Job | Platform | Failed tests | Categories |
|---|---|---|---|
| `confirmations-android-smoke-1` | Android | 2 | detox-tap-failed |
| `confirmations-android-smoke-2` | Android | 5 | detox-tap-failed |
| `confirmations-android-smoke-3` | Android | 5 | detox-tap-failed, fixture-cleanup-failure |
| `confirmations-android-smoke-4` | Android | 4 | detox-tap-failed |
| `confirmations-ios-smoke-3` | iOS | 2 | fixture-cleanup-failure |
| `network-abstraction-android-smoke-1` | Android | 2 | detox-assertion-retry-exhausted |
| `network-abstraction-android-smoke-2` | Android | 2 | detox-assertion-retry-exhausted |
| `network-abstraction-ios-smoke-1` | iOS | 2 | detox-element-not-found |
| `network-abstraction-ios-smoke-2` | iOS | 2 | detox-element-not-found |
| `network-expansion-android-smoke-1` | Android | 3 | detox-tap-failed |
| `network-expansion-android-smoke-2` | Android | 2 | detox-tap-failed |
| `prediction-market-android-smoke-1` | Android | 3 | detox-assertion-retry-exhausted, jest-test-timeout |
| `prediction-market-ios-smoke-1` | iOS | 2 | detox-element-not-found |
| `ramps-android-smoke-1` | Android | 2 | other |
| `ramps-ios-smoke-1` | iOS | 2 | detox-element-not-found |
| `seedless-onboarding-android-smoke-1` | Android | 9 | detox-assertion-retry-exhausted |
| `seedless-onboarding-ios-smoke-1` | iOS | 8 | detox-element-not-found |
| `snaps-android-smoke-1` | Android | 4 | detox-tap-failed |
| `snaps-android-smoke-2` | Android | 8 | detox-retry-exhausted, detox-tap-failed, other |
| `snaps-android-smoke-3` | Android | 5 | detox-retry-exhausted |
| `trade-ios-smoke-1` | iOS | 7 | detox-element-not-found |
| `wallet-platform-android-smoke-1` | Android | 6 | detox-assertion-retry-exhausted, detox-tap-failed |
| `wallet-platform-android-smoke-3` | Android | 3 | other |
| `wallet-platform-ios-smoke-1` | iOS | 2 | detox-element-not-found |
| `wallet-platform-ios-smoke-2` | iOS | 3 | detox-element-not-found |

## Category: `detox-element-not-found` (28 tests)

### network-abstraction-ios-smoke-1

- **permission-system-dapp-chain-switch-grant.spec.ts** — SmokeNetworkAbstractions: Chain Permission System When a dApp requests to switch to a new chain grants permission to the new chain and switches to it when approved
  - MATCHER(id == “accounts-connected-network-picker”) TIMEOUT(100ms)
  - platform: iOS, time: 103.1s
- **network-manager.spec.ts** — SmokeNetworkAbstractions: Network Manager should reflect the correct enabled networks state in the network manager
  - MATCHER(id == “accounts-connected-network-picker”) TIMEOUT(100ms)
  - platform: iOS, time: 56.5s

### network-abstraction-ios-smoke-2

- **network-manager2.spec.ts** — SmokeNetworkAbstractions: Network Manager should preserve existing enabled networks when adding a network via dapp
  - MATCHER(id == “navigate_to_edit_networks_permissions_button”) TIMEOUT(100ms)
  - platform: iOS, time: 79.3s
- **network-manager2.spec.ts** — SmokeNetworkAbstractions: Network Manager should filter tokens by selected network from list of enabled popular networks
  - MATCHER(id == “navigate_to_edit_networks_permissions_button”) TIMEOUT(100ms)
  - platform: iOS, time: 55.4s

### prediction-market-ios-smoke-1

- **predict-withdraw.spec.ts** — SmokePredictions: Predictions Withdraw withdraws from Predict balance
  - MATCHER(id == “predict-market-list-container”) TIMEOUT(100ms)
  - platform: iOS, time: 62.7s
- **predict-claim-positions.spec.ts** — SmokePredictions: Claim winnings: claim winnings via predictions section
  - MATCHER(id == “predict-market-list-container”) TIMEOUT(100ms)
  - platform: iOS, time: 96.8s

### ramps-ios-smoke-1

- **onramp-unified-buy.spec.ts** — SmokeRamps: Onramp Unified Buy New user native flow: Places ETH DEPOSIT order through Transak
  - MATCHER(id == “token-select-modal-search-input”) TIMEOUT(15s)
  - platform: iOS, time: 64.8s
- **onramp-unified-buy.spec.ts** — SmokeRamps: Onramp Unified Buy Returning User Aggregator Flow: Places ETH BUY order
  - MATCHER(id == “token-select-modal-search-input”) TIMEOUT(15s)
  - platform: iOS, time: 63.6s

### seedless-onboarding-ios-smoke-1

- **google-login-existing-user.spec.ts** — SmokeSeedlessOnboarding: Google Login - Existing User shows Account Already Exists screen for existing Google user
  - MATCHER(id == “account-status-found-container-id”) TIMEOUT(100ms)
  - platform: iOS, time: 37.5s
- **google-login-existing-user.spec.ts** — SmokeSeedlessOnboarding: Google Login - Existing User can tap Login button on Account Already Exists screen
  - MATCHER(id == “account-status-found-container-id”) TIMEOUT(100ms)
  - platform: iOS, time: 38.7s
- **apple-login-existing-user.spec.ts** — SmokeSeedlessOnboarding: Apple Login - Existing User shows Account Already Exists screen for existing Apple user
  - MATCHER(id == “account-status-found-container-id”) TIMEOUT(100ms)
  - platform: iOS, time: 38.3s
- **apple-login-existing-user.spec.ts** — SmokeSeedlessOnboarding: Apple Login - Existing User can tap Login button on Account Already Exists screen
  - MATCHER(id == “account-status-found-container-id”) TIMEOUT(100ms)
  - platform: iOS, time: 39.7s
- **google-login-add-srp.spec.ts** — SmokeSeedlessOnboarding: Google Login - Add New SRP creates wallet with Google login and adds a new SRP
  - MATCHER(id == “social-login-ios-user-new-user-title-id”) TIMEOUT(100ms)
  - platform: iOS, time: 39.6s
- **google-login-new-user.spec.ts** — SmokeSeedlessOnboarding: Google Login - New User creates a new wallet with Google login
  - MATCHER(id == “social-login-ios-user-new-user-title-id”) TIMEOUT(100ms)
  - platform: iOS, time: 38.3s
- **apple-login-new-user.spec.ts** — SmokeSeedlessOnboarding: Apple Login - New User creates a new wallet with Apple login
  - MATCHER(id == “social-login-ios-user-new-user-title-id”) TIMEOUT(100ms)
  - platform: iOS, time: 37.9s
- **google-login-lock-unlock.spec.ts** — SmokeSeedlessOnboarding: Google Login - Lock and Unlock onboards with Google login, locks, and unlocks the app
  - MATCHER(id == “social-login-ios-user-new-user-title-id”) TIMEOUT(100ms)
  - platform: iOS, time: 63.7s

### trade-ios-smoke-1

- **gasless-swap.spec.ts** — SmokeTrade: Gasless Swap -  completes a gasless 7702 ETH to MUSD swap (native source)
  - Element matcher timed out
  - platform: iOS, time: 76.0s
- **swap-deeplink-smoke.spec.ts** — SmokeTrade: Swap Deep Link Tests - Unified Bridge Experience navigate to bridge view with full parameters (USDC to USDT)
  - MATCHER(id == “bridge-confirm-button”) TIMEOUT(100ms)
  - platform: iOS, time: 74.3s
- **bridge-action-smoke.spec.ts** — SmokeTrade: Bridge functionality should bridge ETH (Mainnet) to ETH (Base Network)
  - Element matcher timed out
  - platform: iOS, time: 82.9s
- **swap-action-smoke.spec.ts** — SmokeTrade: Swap from Actions swaps ETH-&gt;USDC with custom slippage and USDC-&gt;ETH
  - Element matcher timed out
  - platform: iOS, time: 127.7s
- **stake-action-smoke.spec.ts** — SmokeTrade: Stake from Actions should be able to import stake test account with funds
  - MATCHER(id == “bridge-confirm-button”) TIMEOUT(100ms)
  - platform: iOS, time: 59.3s
- **swap-deeplink-smoke.spec.ts** — SmokeTrade: Swap Deep Link Tests - Unified Bridge Experience navigate to bridge view with no parameters
  - Element matcher timed out
  - platform: iOS, time: 50.2s
- **lending-deposit-smoke.spec.ts** — SmokeTrade: Lending Deposit from Wallet deposits USDC into Aave lending market
  - Element matcher timed out
  - platform: iOS, time: 69.2s

### wallet-platform-ios-smoke-1

- **import-wallet.spec.ts** — SmokeWalletPlatform: Analytics during import wallet flow tracks analytics events during wallet import flow
  - MATCHER(id == “phrase-input-id”) TIMEOUT(15s)
  - platform: iOS, time: 40.2s
- **import-wallet.spec.ts** — SmokeWalletPlatform: Analytics during import wallet flow does not track analytics events when opt-in to metrics is off
  - MATCHER(id == “phrase-input-id”) TIMEOUT(15s)
  - platform: iOS, time: 41.3s

### wallet-platform-ios-smoke-2

- **new-wallet.spec.ts** — SmokeWalletPlatform: Analytics during new wallet flow tracks analytics events during new wallet flow
  - MATCHER(id == “create-password-screen”) TIMEOUT(100ms)
  - platform: iOS, time: 35.4s
- **new-wallet.spec.ts** — SmokeWalletPlatform: Analytics during new wallet flow does not track analytics events when opt-in to metrics is off
  - MATCHER(id == “create-password-screen”) TIMEOUT(100ms)
  - platform: iOS, time: 35.9s
- **trending-feed.spec.ts** — SmokeWalletPlatform: Trending Feed View All Navigation Navigate to all sections full views via View All and return to feed
  - MATCHER(id == “create-password-screen”) TIMEOUT(100ms)
  - platform: iOS, time: 174.1s

## Category: `detox-tap-failed` (27 tests)

### confirmations-android-smoke-1

- **contract-interaction.spec.ts** — SmokeConfirmations: Contract Interaction submits transaction
  - Cannot tap: Close browser button
  - platform: Android, time: 72.2s
- **gas-fee-tokens-eip-7702.spec.ts** — SmokeConfirmations: Send native asset Gas Station using EIP-7702 Send ETH via EIP-7702 paying gas with USDC
  - Cannot tap: Close browser button
  - platform: Android, time: 59.4s

### confirmations-android-smoke-2

- **set-approval-for-all.spec.ts** — SmokeConfirmations: Token Approve - setApprovalForAll method creates an approve transaction confirmation for given ERC721 and submits it
  - Cannot tap: Close browser button
  - platform: Android, time: 71.5s
- **set-approval-for-all.spec.ts** — SmokeConfirmations: Token Approve - setApprovalForAll method creates an approve transaction confirmation for given ERC1155 and submits it
  - Cannot tap: Close browser button
  - platform: Android, time: 72.4s
- **set-approval-for-all.spec.ts** — SmokeConfirmations: Token Approve - setApprovalForAll method revoke mode creates an approve transaction confirmation for ERC 721 and submits it
  - Cannot tap: Close browser button
  - platform: Android, time: 74.4s
- **batch-transaction.spec.ts** — SmokeConfirmations: 7702 - smart account submit sendCalls, upgrade, downgrade account
  - Cannot tap: Close browser button
  - platform: Android, time: 75.7s
- **contract-deployment.spec.ts** — SmokeConfirmations: Contract Deployment deploys a contract
  - Cannot tap: Close browser button
  - platform: Android, time: 75.3s

### confirmations-android-smoke-3

- **dapp-initiated-transfer.spec.ts** — SmokeConfirmations: DApp Initiated Transfer sends native asset and validates MetaMetrics transaction events
  - Cannot tap: Close browser button
  - platform: Android, time: 71.4s
- **per-dapp-selected-network.spec.ts** — SmokeConfirmations: Dapp Network Switching submits a transaction to a dapp-specific selected network
  - Cannot tap: Close browser button
  - platform: Android, time: 62.1s
- **gas-fee-tokens-eip-7702-sponsored.spec.ts** — SmokeConfirmations: Send native asset using EIP-7702 - Success Case sends ETH sponsored
  - Cannot tap: Close browser button
  - platform: Android, time: 55.7s

### confirmations-android-smoke-4

- **approve.spec.ts** — SmokeConfirmations: Token Approve - approve method creates an approve transaction confirmation for given ERC 20, changes the spending cap and submits it
  - Cannot tap: Close browser button
  - platform: Android, time: 76.1s
- **approve.spec.ts** — SmokeConfirmations: Token Approve - approve method creates an approve transaction confirmation for ERC 721 and submits it
  - Cannot tap: Close browser button
  - platform: Android, time: 73.2s
- **increase-allowance.spec.ts** — SmokeConfirmations: Token Approve - increaseAllowance method creates an approve transaction confirmation for given ERC 20, changes the spending cap and submits it
  - Cannot tap: Close browser button
  - platform: Android, time: 79.6s
- **send-erc20-token.spec.ts** — SmokeConfirmations: Send ERC20 asset should send USDC amount 5 to an address
  - Cannot tap: Close browser button
  - platform: Android, time: 46.2s

### network-expansion-android-smoke-1

- **multiple-provider-connections.spec.ts** — SmokeNetworkExpansion: Multiple Standard Dapp Connections should default account selection to already permitted account when &quot;wallet_requestPermissions&quot; is called with no accounts specified
  - Cannot tap: Network avatar or account button
  - platform: Android, time: 65.6s
- **multiple-provider-connections.spec.ts** — SmokeNetworkExpansion: Multiple Standard Dapp Connections should retain Solana permissions when connecting through the EVM provider
  - Cannot tap: Network avatar or account button
  - platform: Android, time: 62.4s
- **multiple-provider-connections.spec.ts** — SmokeNetworkExpansion: Multiple Standard Dapp Connections should default account selection to already permitted Solana account and requested Ethereum account when &quot;wallet_requestPermissions&quot; is called with specific Ethereum account
  - Cannot tap: Network avatar or account button
  - platform: Android, time: 63.9s

### network-expansion-android-smoke-2

- **permission-system-initial-connection.spec.ts** — SmokeNetworkExpansion: Chain Permission Management grants default permissions to single account and chain on first connect
  - Cannot tap: Network avatar or account button
  - platform: Android, time: 62.6s
- **connect.spec.ts** — SmokeNetworkExpansion: Solana Wallet Standard E2E - Connect Should stay connected after page refresh
  - Cannot tap: Network avatar or account button
  - platform: Android, time: 53.2s

### snaps-android-smoke-1

- **test-snap-management.spec.ts** — SmokeSnaps: Snap Management Tests can disable a Snap
  - Cannot tap: Close browser button
  - platform: Android, time: 18.1s
- **test-snap-management.spec.ts** — SmokeSnaps: Snap Management Tests can enable a Snap
  - Cannot tap: Close browser button
  - platform: Android, time: 17.8s
- **test-snap-management.spec.ts** — SmokeSnaps: Snap Management Tests can remove a Snap
  - Cannot tap: Close browser button
  - platform: Android, time: 17.9s
- **test-snap-interactive-ui.spec.ts** — SmokeSnaps: Interactive UI Snap Tests can connect to the Interactive UI Snap
  - Cannot tap: Close browser button
  - platform: Android, time: 59.9s

### snaps-android-smoke-2

- **test-snap-name-lookup.spec.ts** — SmokeSnaps: Name Lookup Snap Tests displays the resolved recipient address in the send flow
  - Cannot tap: Close browser button
  - platform: Android, time: 69.8s

### wallet-platform-android-smoke-1

- **evm-provider-events.spec.ts** — SmokeWalletPlatform: EVM Provider Events notifies a dapp when the wallet switches to an account it has permission to access. 
  - Cannot tap: Close browser button
  - platform: Android, time: 65.0s
- **evm-provider-events.spec.ts** — SmokeWalletPlatform: EVM Provider Events notifies a permitted dapp of the new chain ID when the network changes
  - Cannot tap: Network avatar or account button
  - platform: Android, time: 61.1s
- **homepage-sections-network-filter.spec.ts** — SmokeWalletPlatform: Homepage Tokens Section - Network Filter navigates from homepage tokens section to tokens full view
  - Cannot tap: Close browser button
  - platform: Android, time: 36.4s

## Category: `detox-assertion-retry-exhausted` (18 tests)

### network-abstraction-android-smoke-1

- **permission-system-dapp-chain-switch-grant.spec.ts** — SmokeNetworkAbstractions: Chain Permission System When a dApp requests to switch to a new chain grants permission to the new chain and switches to it when approved
  - Assert element has label "l E" never satisfied
  - platform: Android, time: 79.2s
- **view-market-insights.spec.ts** — SmokeNetworkAbstractions: View Market Insights on Asset Details displays market insights content and navigates to swap
  - Assert element has label "l E" never satisfied
  - platform: Android, time: 56.0s

### network-abstraction-android-smoke-2

- **network-manager2.spec.ts** — SmokeNetworkAbstractions: Network Manager should preserve existing enabled networks when adding a network via dapp
  - Assert edit networks permissions button should show "Use your enabled networks Requesting for Polygon Mainnet" never satisfied
  - platform: Android, time: 64.0s
- **network-manager2.spec.ts** — SmokeNetworkAbstractions: Network Manager should filter tokens by selected network from list of enabled popular networks
  - Assert edit networks permissions button should show "Use your enabled networks Requesting for Polygon Mainnet" never satisfied
  - platform: Android, time: 33.1s

### prediction-market-android-smoke-1

- **predict-withdraw.spec.ts** — SmokePredictions: Predictions Withdraw withdraws from Predict balance
  - Assert Predict market list should be visible after withdraw confirmation never satisfied
  - platform: Android, time: 55.2s
- **predict-claim-positions.spec.ts** — SmokePredictions: Claim winnings: claim winnings via predictions section
  - Assert Predict market list should be visible after withdraw confirmation never satisfied
  - platform: Android, time: 66.3s

### seedless-onboarding-android-smoke-1

- **google-login-existing-user.spec.ts** — SmokeSeedlessOnboarding: Google Login - Existing User shows Account Already Exists screen for existing Google user
  - Assert Account Already Exists screen should be visible never satisfied
  - platform: Android, time: 33.6s
- **google-login-existing-user.spec.ts** — SmokeSeedlessOnboarding: Google Login - Existing User can tap Login button on Account Already Exists screen
  - Assert Account Already Exists screen should be visible never satisfied
  - platform: Android, time: 35.4s
- **apple-login-existing-user.spec.ts** — SmokeSeedlessOnboarding: Apple Login - Existing User shows Account Already Exists screen for existing Apple user
  - Assert Account Already Exists screen should be visible never satisfied
  - platform: Android, time: 34.1s
- **apple-login-existing-user.spec.ts** — SmokeSeedlessOnboarding: Apple Login - Existing User can tap Login button on Account Already Exists screen
  - Assert Account Already Exists screen should be visible never satisfied
  - platform: Android, time: 35.4s
- **google-login-add-srp.spec.ts** — SmokeSeedlessOnboarding: Google Login - Add New SRP creates wallet with Google login and adds a new SRP
  - Assert Password creation screen should be visible never satisfied
  - platform: Android, time: 35.6s
- **google-login-lock-unlock.spec.ts** — SmokeSeedlessOnboarding: Google Login - Lock and Unlock onboards with Google login, locks, and unlocks the app
  - Assert Password creation screen should be visible never satisfied
  - platform: Android, time: 34.4s
- **google-login-reset-wallet.spec.ts** — SmokeSeedlessOnboarding: Google Login - Reset Wallet onboards with Google login, locks, and resets the wallet
  - Assert Password creation screen should be visible never satisfied
  - platform: Android, time: 34.8s
- **google-login-new-user.spec.ts** — SmokeSeedlessOnboarding: Google Login - New User creates a new wallet with Google login
  - Assert Password creation screen should be visible never satisfied
  - platform: Android, time: 34.7s
- **apple-login-new-user.spec.ts** — SmokeSeedlessOnboarding: Apple Login - New User creates a new wallet with Apple login
  - Assert Password creation screen should be visible never satisfied
  - platform: Android, time: 35.5s

### wallet-platform-android-smoke-1

- **new-wallet.spec.ts** — SmokeWalletPlatform: Analytics during new wallet flow tracks analytics events during new wallet flow
  - Assert Create Password View should be visible never satisfied
  - platform: Android, time: 33.4s
- **new-wallet.spec.ts** — SmokeWalletPlatform: Analytics during new wallet flow does not track analytics events when opt-in to metrics is off
  - Assert Create Password View should be visible never satisfied
  - platform: Android, time: 33.8s
- **delete-account.spec.ts** — SmokeWalletPlatform: Multichain Accounts: Account Details deletes the account
  - Assert Create Password View should be visible never satisfied
  - platform: Android, time: 35.5s

## Category: `detox-retry-exhausted` (9 tests)

### snaps-android-smoke-2

- **test-snap-manage-state.spec.ts** — SmokeSnaps: Manage State Snap Tests legacy state functions encrypted state clears the state
  - Generic retry exhausted on: Description not provided
  - platform: Android, time: 212.6s
- **test-snap-bip-44.spec.ts** — SmokeSnaps: BIP-44 Snap Tests fails when choosing the invalid entropy source
  - Generic retry exhausted on: Description not provided
  - platform: Android, time: 36.0s
- **test-snap-manage-state.spec.ts** — SmokeSnaps: Manage State Snap Tests connects to the State Snap
  - Generic retry exhausted on: Description not provided
  - platform: Android, time: 65.4s
- **test-snap-bip-44.spec.ts** — SmokeSnaps: BIP-44 Snap Tests can connect to BIP-44 snap
  - Generic retry exhausted on: Description not provided
  - platform: Android, time: 63.9s

### snaps-android-smoke-3

- **test-snap-bip-32.spec.ts** — SmokeSnaps: BIP-32 Snap Tests fails when choosing the invalid entropy source
  - Generic retry exhausted on: Description not provided
  - platform: Android, time: 35.8s
- **test-snap-background-events.spec.ts** — SmokeSnaps: Background Events Snap Tests shows an error when trying to schedule a background event in the past
  - Generic retry exhausted on: Description not provided
  - platform: Android, time: 34.7s
- **test-snap-ethereum-provider.spec.ts** — SmokeSnaps: Ethereum Provider Snap Tests can use the Ethereum provider
  - Generic retry exhausted on: Description not provided
  - platform: Android, time: 66.3s
- **test-snap-bip-32.spec.ts** — SmokeSnaps: BIP-32 Snap Tests can connect to BIP-32 snap
  - Generic retry exhausted on: Description not provided
  - platform: Android, time: 57.4s
- **test-snap-background-events.spec.ts** — SmokeSnaps: Background Events Snap Tests can connect to the background events Snap
  - Generic retry exhausted on: Description not provided
  - platform: Android, time: 61.8s

## Category: `other` (8 tests)

### ramps-android-smoke-1

- **onramp-unified-buy.spec.ts** — SmokeRamps: Onramp Unified Buy New user native flow: Places ETH DEPOSIT order through Transak
  - ❌ typeText("ETH") failed after 1 attempt(s) over 15014ms
  - platform: Android, time: 47.9s
- **onramp-unified-buy.spec.ts** — SmokeRamps: Onramp Unified Buy Returning User Aggregator Flow: Places ETH BUY order
  - ❌ typeText("ETH") failed after 1 attempt(s) over 15016ms
  - platform: Android, time: 48.4s

### snaps-android-smoke-2

- **test-snap-manage-state.spec.ts** — SmokeSnaps: Manage State Snap Tests legacy state functions unencrypted state sets and retrieves unencrypted state
  - ❌ typeText("23") failed after 30 attempt(s) over 14516ms
  - platform: Android, time: 226.0s
- **test-snap-manage-state.spec.ts** — SmokeSnaps: Manage State Snap Tests legacy state functions unencrypted state clears the unencrypted state
  - ❌ scrollToWebViewPort() failed after 1 attempt(s) over 60006ms
  - platform: Android, time: 211.5s
- **test-snap-multichain-provider.spec.ts** — SmokeSnaps: Multichain Provider Snap Tests can use the Multichain provider
  - Error: Command failed: "/opt/android-sdk/platform-tools/adb" -s emulator-14546 shell "am force-stop io.metamask"
  - platform: Android, time: 239.1s

### wallet-platform-android-smoke-3

- **import-wallet.spec.ts** — SmokeWalletPlatform: Analytics during import wallet flow tracks analytics events during wallet import flow
  - ❌ replaceText("leisure swallow trip elbow prison wait rely keep supply hole general mountain") failed after 30 attempt(s) over 14765ms
  - platform: Android, time: 32.3s
- **import-wallet.spec.ts** — SmokeWalletPlatform: Analytics during import wallet flow does not track analytics events when opt-in to metrics is off
  - ❌ replaceText("leisure swallow trip elbow prison wait rely keep supply hole general mountain") failed after 30 attempt(s) over 14728ms
  - platform: Android, time: 33.1s
- **trending-feed.spec.ts** — SmokeWalletPlatform: Trending Feed View All Navigation Navigate to all sections full views via View All and return to feed
  - ❌ replaceText("leisure swallow trip elbow prison wait rely keep supply hole general mountain") failed after 30 attempt(s) over 14765ms
  - platform: Android, time: 109.5s

## Category: `fixture-cleanup-failure` (4 tests)

### confirmations-android-smoke-3

- **transaction-pay.spec.ts** — SmokeConfirmations: Transaction Pay deposits to predict balance
  - Cleanup helper threw
  - platform: Android, time: 55.0s
- **signatures-typed.spec.ts** — SmokeConfirmations: Typed Signature Requests should sign Typed V1 Sign message
  - Cleanup helper threw
  - platform: Android, time: 54.7s

### confirmations-ios-smoke-3

- **transaction-pay.spec.ts** — SmokeConfirmations: Transaction Pay deposits to predict balance
  - Cleanup helper threw
  - platform: iOS, time: 69.5s
- **per-dapp-selected-network.spec.ts** — SmokeConfirmations: Dapp Network Switching submits a transaction to a dapp-specific selected network
  - Cleanup helper threw
  - platform: iOS, time: 121.3s

## Category: `jest-test-timeout` (1 tests)

### prediction-market-android-smoke-1

- **predict-cash-out.spec.ts** — SmokePredictions: Predictions cashes out on open position: Spurs vs. Pelicans
  - platform: Android, time: 301.5s

