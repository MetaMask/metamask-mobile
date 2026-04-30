# E2E Failures Snapshot

- **PR**: [#29511](https://github.com/MetaMask/metamask-mobile/pull/29511)
- **Workflow run**: `25159833935`
- **Branch**: `chore/build-e2e-rn-update-81`
- **Commit**: `510259b1` (chore(detox): bump to ^20.43.0)

Total unique failing tests at snapshot: **108**

## Triage progress

| #   | Target                                                         | Status                    | Fix                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --- | -------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `seedless-onboarding-*` (17 tests, both platforms)             | 🛠️ **Fix shipped**        | `tests/module-mocking/sentry/react-native.ts` — added missing `lastEventId` and `withScope` exports + `Scope` class. Without them, `ErrorBoundary.componentDidCatch` throws `TypeError: undefined is not a function` whenever any child component errors, cascading the entire JS context down. The "waitAndTap() failed" symptom is misleading — the app crashed, not the element. **Many other failing tests in this snapshot may be downstream of this same bug** since ErrorBoundary wraps every screen in `app/components/Nav/Main/index.tsx`. Re-run will confirm. |
| 2   | `trade-ios-smoke-1` (7 tests, `detox-element-not-found`)       | ⏭️ Pending                | Suspect renamed Trade selector                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 3   | `confirmations-android-smoke-*` (16 tests, `detox-tap-failed`) | ⏭️ Pending                | Same modal close button likely covered                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 4   | `network-abstraction-*` and `network-expansion-*` (12 tests)   | ⏭️ Pending                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 5   | `prediction-market-*` (5 tests)                                | ⏭️ Pending                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 6   | `ramps-*` (4 tests)                                            | ⏭️ Pending                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 7   | `snaps-*` infra failures (port-collision, anvil)               | ⏭️ Pending — likely flake |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

## Failure categories

| Category                          | Count | Likely root cause                                                                                                                  |
| --------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `detox-tap-failed`                | 59    | Element exists but is not tappable (covered/animated/offscreen). UI changes from RN 0.81 upgrade likely cover the tested elements. |
| `detox-element-not-found`         | 13    | Matcher never matches — selector changed or element renamed/removed.                                                               |
| `port-collision`                  | 10    | Anvil/Mock server failed to bind a port (EADDRINUSE) — flaky CI runner state.                                                      |
| `detox-retry-exhausted`           | 9     | Generic Detox retry budget exhausted on a non-tap action.                                                                          |
| `detox-assertion-retry-exhausted` | 6     | Assertion never became true within the retry budget.                                                                               |
| `fixture-cleanup-failure`         | 5     | Test cleanup helper threw — usually a downstream effect of the test body failing.                                                  |
| `jest-test-timeout`               | 5     | Test exceeded global jest timeout (300s) — usually means the test hung waiting for an event.                                       |
| `anvil-crashed`                   | 1     | Local Anvil node exited mid-test.                                                                                                  |

## Per-job summary

| Job                                   | Platform | Failed tests | Categories                                                              |
| ------------------------------------- | -------- | ------------ | ----------------------------------------------------------------------- |
| `confirmations-android-smoke-1`       | Android  | 2            | detox-tap-failed                                                        |
| `confirmations-android-smoke-2`       | Android  | 5            | detox-tap-failed                                                        |
| `confirmations-android-smoke-3`       | Android  | 5            | detox-tap-failed, fixture-cleanup-failure                               |
| `confirmations-android-smoke-4`       | Android  | 4            | detox-tap-failed                                                        |
| `confirmations-ios-smoke-3`           | iOS      | 2            | fixture-cleanup-failure                                                 |
| `network-abstraction-android-smoke-1` | Android  | 2            | detox-assertion-retry-exhausted                                         |
| `network-abstraction-android-smoke-2` | Android  | 2            | detox-assertion-retry-exhausted                                         |
| `network-abstraction-ios-smoke-1`     | iOS      | 2            | detox-element-not-found                                                 |
| `network-abstraction-ios-smoke-2`     | iOS      | 3            | detox-element-not-found, fixture-cleanup-failure                        |
| `network-expansion-android-smoke-1`   | Android  | 3            | detox-tap-failed                                                        |
| `network-expansion-android-smoke-2`   | Android  | 2            | detox-tap-failed                                                        |
| `prediction-market-android-smoke-1`   | Android  | 3            | detox-assertion-retry-exhausted, jest-test-timeout                      |
| `prediction-market-ios-smoke-1`       | iOS      | 2            | detox-element-not-found                                                 |
| `ramps-android-smoke-1`               | Android  | 2            | detox-tap-failed                                                        |
| `ramps-ios-smoke-1`                   | iOS      | 2            | detox-tap-failed                                                        |
| `seedless-onboarding-android-smoke-1` | Android  | 9            | detox-tap-failed                                                        |
| `seedless-onboarding-ios-smoke-1`     | iOS      | 8            | detox-tap-failed                                                        |
| `snaps-android-smoke-1`               | Android  | 5            | detox-tap-failed, jest-test-timeout                                     |
| `snaps-android-smoke-2`               | Android  | 7            | detox-retry-exhausted, detox-tap-failed                                 |
| `snaps-android-smoke-3`               | Android  | 11           | anvil-crashed, detox-retry-exhausted, jest-test-timeout, port-collision |
| `snaps-ios-smoke-2`                   | iOS      | 6            | jest-test-timeout, port-collision                                       |
| `trade-ios-smoke-1`                   | iOS      | 7            | detox-element-not-found                                                 |
| `wallet-platform-android-smoke-1`     | Android  | 6            | detox-tap-failed                                                        |
| `wallet-platform-android-smoke-3`     | Android  | 3            | detox-tap-failed                                                        |
| `wallet-platform-ios-smoke-1`         | iOS      | 2            | detox-tap-failed                                                        |
| `wallet-platform-ios-smoke-2`         | iOS      | 3            | detox-tap-failed                                                        |

## Category: `detox-tap-failed` (59 tests)

### confirmations-android-smoke-1

- **contract-interaction.spec.ts** — SmokeConfirmations: Contract Interaction submits transaction
  - Cannot tap: Close browser button
  - platform: Android, time: 72.1s
- **gas-fee-tokens-eip-7702.spec.ts** — SmokeConfirmations: Send native asset Gas Station using EIP-7702 Send ETH via EIP-7702 paying gas with USDC
  - Cannot tap: Close browser button
  - platform: Android, time: 62.1s

### confirmations-android-smoke-2

- **set-approval-for-all.spec.ts** — SmokeConfirmations: Token Approve - setApprovalForAll method creates an approve transaction confirmation for given ERC721 and submits it
  - Cannot tap: Close browser button
  - platform: Android, time: 71.5s
- **set-approval-for-all.spec.ts** — SmokeConfirmations: Token Approve - setApprovalForAll method creates an approve transaction confirmation for given ERC1155 and submits it
  - Cannot tap: Close browser button
  - platform: Android, time: 71.4s
- **set-approval-for-all.spec.ts** — SmokeConfirmations: Token Approve - setApprovalForAll method revoke mode creates an approve transaction confirmation for ERC 721 and submits it
  - Cannot tap: Close browser button
  - platform: Android, time: 72.4s
- **batch-transaction.spec.ts** — SmokeConfirmations: 7702 - smart account submit sendCalls, upgrade, downgrade account
  - Cannot tap: Close browser button
  - platform: Android, time: 73.3s
- **contract-deployment.spec.ts** — SmokeConfirmations: Contract Deployment deploys a contract
  - Cannot tap: Close browser button
  - platform: Android, time: 73.8s

### confirmations-android-smoke-3

- **dapp-initiated-transfer.spec.ts** — SmokeConfirmations: DApp Initiated Transfer sends native asset and validates MetaMetrics transaction events
  - Cannot tap: Close browser button
  - platform: Android, time: 71.7s
- **per-dapp-selected-network.spec.ts** — SmokeConfirmations: Dapp Network Switching submits a transaction to a dapp-specific selected network
  - Cannot tap: Close browser button
  - platform: Android, time: 57.5s
- **gas-fee-tokens-eip-7702-sponsored.spec.ts** — SmokeConfirmations: Send native asset using EIP-7702 - Success Case sends ETH sponsored
  - Cannot tap: Close browser button
  - platform: Android, time: 57.9s

### confirmations-android-smoke-4

- **approve.spec.ts** — SmokeConfirmations: Token Approve - approve method creates an approve transaction confirmation for given ERC 20, changes the spending cap and submits it
  - Cannot tap: Close browser button
  - platform: Android, time: 81.9s
- **approve.spec.ts** — SmokeConfirmations: Token Approve - approve method creates an approve transaction confirmation for ERC 721 and submits it
  - Cannot tap: Close browser button
  - platform: Android, time: 74.2s
- **increase-allowance.spec.ts** — SmokeConfirmations: Token Approve - increaseAllowance method creates an approve transaction confirmation for given ERC 20, changes the spending cap and submits it
  - Cannot tap: Close browser button
  - platform: Android, time: 79.2s
- **send-erc20-token.spec.ts** — SmokeConfirmations: Send ERC20 asset should send USDC amount 5 to an address
  - Cannot tap: Close browser button
  - platform: Android, time: 50.4s

### network-expansion-android-smoke-1

- **multiple-provider-connections.spec.ts** — SmokeNetworkExpansion: Multiple Standard Dapp Connections should default account selection to already permitted account when &quot;wallet_requestPermissions&quot; is called with no accounts specified
  - Cannot tap: Network avatar or account button
  - platform: Android, time: 64.3s
- **multiple-provider-connections.spec.ts** — SmokeNetworkExpansion: Multiple Standard Dapp Connections should retain Solana permissions when connecting through the EVM provider
  - Cannot tap: Network avatar or account button
  - platform: Android, time: 66.2s
- **multiple-provider-connections.spec.ts** — SmokeNetworkExpansion: Multiple Standard Dapp Connections should default account selection to already permitted Solana account and requested Ethereum account when &quot;wallet_requestPermissions&quot; is called with specific Ethereum account
  - Cannot tap: Network avatar or account button
  - platform: Android, time: 62.5s

### network-expansion-android-smoke-2

- **permission-system-initial-connection.spec.ts** — SmokeNetworkExpansion: Chain Permission Management grants default permissions to single account and chain on first connect
  - Cannot tap: Network avatar or account button
  - platform: Android, time: 61.7s
- **connect.spec.ts** — SmokeNetworkExpansion: Solana Wallet Standard E2E - Connect Should stay connected after page refresh
  - Cannot tap: Network avatar or account button
  - platform: Android, time: 51.9s

### ramps-android-smoke-1

- **onramp-unified-buy.spec.ts** — SmokeRamps: Onramp Unified Buy New user native flow: Places ETH DEPOSIT order through Transak
  - Cannot tap: Description not provided
  - platform: Android, time: 48.2s
- **onramp-unified-buy.spec.ts** — SmokeRamps: Onramp Unified Buy Returning User Aggregator Flow: Places ETH BUY order
  - Cannot tap: Description not provided
  - platform: Android, time: 47.7s

### ramps-ios-smoke-1

- **onramp-unified-buy.spec.ts** — SmokeRamps: Onramp Unified Buy New user native flow: Places ETH DEPOSIT order through Transak
  - Cannot tap: Description not provided
  - platform: iOS, time: 66.6s
- **onramp-unified-buy.spec.ts** — SmokeRamps: Onramp Unified Buy Returning User Aggregator Flow: Places ETH BUY order
  - Cannot tap: Description not provided
  - platform: iOS, time: 60.2s

### seedless-onboarding-android-smoke-1

- **google-login-existing-user.spec.ts** — SmokeSeedlessOnboarding: Google Login - Existing User shows Account Already Exists screen for existing Google user
  - Cannot tap: Google Login Button in Onboarding Sheet
  - platform: Android, time: 34.1s
- **google-login-existing-user.spec.ts** — SmokeSeedlessOnboarding: Google Login - Existing User can tap Login button on Account Already Exists screen
  - Cannot tap: Google Login Button in Onboarding Sheet
  - platform: Android, time: 32.9s
- **apple-login-existing-user.spec.ts** — SmokeSeedlessOnboarding: Apple Login - Existing User shows Account Already Exists screen for existing Apple user
  - Cannot tap: Apple Login Button in Onboarding Sheet
  - platform: Android, time: 34.1s
- **apple-login-existing-user.spec.ts** — SmokeSeedlessOnboarding: Apple Login - Existing User can tap Login button on Account Already Exists screen
  - Cannot tap: Apple Login Button in Onboarding Sheet
  - platform: Android, time: 33.6s
- **google-login-add-srp.spec.ts** — SmokeSeedlessOnboarding: Google Login - Add New SRP creates wallet with Google login and adds a new SRP
  - Cannot tap: Google Login Button in Onboarding Sheet
  - platform: Android, time: 33.8s
- **google-login-lock-unlock.spec.ts** — SmokeSeedlessOnboarding: Google Login - Lock and Unlock onboards with Google login, locks, and unlocks the app
  - Cannot tap: Google Login Button in Onboarding Sheet
  - platform: Android, time: 33.0s
- **google-login-reset-wallet.spec.ts** — SmokeSeedlessOnboarding: Google Login - Reset Wallet onboards with Google login, locks, and resets the wallet
  - Cannot tap: Google Login Button in Onboarding Sheet
  - platform: Android, time: 34.3s
- **google-login-new-user.spec.ts** — SmokeSeedlessOnboarding: Google Login - New User creates a new wallet with Google login
  - Cannot tap: Google Login Button in Onboarding Sheet
  - platform: Android, time: 31.5s
- **apple-login-new-user.spec.ts** — SmokeSeedlessOnboarding: Apple Login - New User creates a new wallet with Apple login
  - Cannot tap: Apple Login Button in Onboarding Sheet
  - platform: Android, time: 32.0s

### seedless-onboarding-ios-smoke-1

- **google-login-existing-user.spec.ts** — SmokeSeedlessOnboarding: Google Login - Existing User shows Account Already Exists screen for existing Google user
  - Cannot tap: Google Login Button in Onboarding Sheet
  - platform: iOS, time: 30.3s
- **google-login-existing-user.spec.ts** — SmokeSeedlessOnboarding: Google Login - Existing User can tap Login button on Account Already Exists screen
  - Cannot tap: Google Login Button in Onboarding Sheet
  - platform: iOS, time: 30.5s
- **apple-login-existing-user.spec.ts** — SmokeSeedlessOnboarding: Apple Login - Existing User shows Account Already Exists screen for existing Apple user
  - Cannot tap: Apple Login Button in Onboarding Sheet
  - platform: iOS, time: 29.9s
- **apple-login-existing-user.spec.ts** — SmokeSeedlessOnboarding: Apple Login - Existing User can tap Login button on Account Already Exists screen
  - Cannot tap: Apple Login Button in Onboarding Sheet
  - platform: iOS, time: 32.1s
- **google-login-add-srp.spec.ts** — SmokeSeedlessOnboarding: Google Login - Add New SRP creates wallet with Google login and adds a new SRP
  - Cannot tap: Google Login Button in Onboarding Sheet
  - platform: iOS, time: 30.3s
- **google-login-new-user.spec.ts** — SmokeSeedlessOnboarding: Google Login - New User creates a new wallet with Google login
  - Cannot tap: Google Login Button in Onboarding Sheet
  - platform: iOS, time: 31.0s
- **apple-login-new-user.spec.ts** — SmokeSeedlessOnboarding: Apple Login - New User creates a new wallet with Apple login
  - Cannot tap: Apple Login Button in Onboarding Sheet
  - platform: iOS, time: 32.9s
- **google-login-lock-unlock.spec.ts** — SmokeSeedlessOnboarding: Google Login - Lock and Unlock onboards with Google login, locks, and unlocks the app
  - Cannot tap: Google Login Button in Onboarding Sheet
  - platform: iOS, time: 62.8s

### snaps-android-smoke-1

- **test-snap-management.spec.ts** — SmokeSnaps: Snap Management Tests can disable a Snap
  - Cannot tap: Close browser button
  - platform: Android, time: 18.2s
- **test-snap-management.spec.ts** — SmokeSnaps: Snap Management Tests can enable a Snap
  - Cannot tap: Close browser button
  - platform: Android, time: 18.4s
- **test-snap-management.spec.ts** — SmokeSnaps: Snap Management Tests can remove a Snap
  - Cannot tap: Close browser button
  - platform: Android, time: 18.0s
- **test-snap-interactive-ui.spec.ts** — SmokeSnaps: Interactive UI Snap Tests can connect to the Interactive UI Snap
  - Cannot tap: Close browser button
  - platform: Android, time: 64.4s

### snaps-android-smoke-2

- **test-snap-name-lookup.spec.ts** — SmokeSnaps: Name Lookup Snap Tests displays the resolved recipient address in the send flow
  - Cannot tap: Close browser button
  - platform: Android, time: 77.2s

### wallet-platform-android-smoke-1

- **evm-provider-events.spec.ts** — SmokeWalletPlatform: EVM Provider Events notifies a dapp when the wallet switches to an account it has permission to access.
  - Cannot tap: Close browser button
  - platform: Android, time: 63.8s
- **evm-provider-events.spec.ts** — SmokeWalletPlatform: EVM Provider Events notifies a permitted dapp of the new chain ID when the network changes
  - Cannot tap: Network avatar or account button
  - platform: Android, time: 62.2s
- **new-wallet.spec.ts** — SmokeWalletPlatform: Analytics during new wallet flow tracks analytics events during new wallet flow
  - Cannot tap: Import Seed Button in Onboarding Sheet
  - platform: Android, time: 32.5s
- **new-wallet.spec.ts** — SmokeWalletPlatform: Analytics during new wallet flow does not track analytics events when opt-in to metrics is off
  - Cannot tap: Import Seed Button in Onboarding Sheet
  - platform: Android, time: 33.6s
- **homepage-sections-network-filter.spec.ts** — SmokeWalletPlatform: Homepage Tokens Section - Network Filter navigates from homepage tokens section to tokens full view
  - Cannot tap: Close browser button
  - platform: Android, time: 37.4s
- **delete-account.spec.ts** — SmokeWalletPlatform: Multichain Accounts: Account Details deletes the account
  - Cannot tap: Import Seed Button in Onboarding Sheet
  - platform: Android, time: 36.1s

### wallet-platform-android-smoke-3

- **import-wallet.spec.ts** — SmokeWalletPlatform: Analytics during import wallet flow tracks analytics events during wallet import flow
  - Cannot tap: Import Seed Button in Onboarding Sheet
  - platform: Android, time: 32.4s
- **import-wallet.spec.ts** — SmokeWalletPlatform: Analytics during import wallet flow does not track analytics events when opt-in to metrics is off
  - Cannot tap: Import Seed Button in Onboarding Sheet
  - platform: Android, time: 32.6s
- **trending-feed.spec.ts** — SmokeWalletPlatform: Trending Feed View All Navigation Navigate to all sections full views via View All and return to feed
  - Cannot tap: Import Seed Button in Onboarding Sheet
  - platform: Android, time: 114.7s

### wallet-platform-ios-smoke-1

- **import-wallet.spec.ts** — SmokeWalletPlatform: Analytics during import wallet flow tracks analytics events during wallet import flow
  - Cannot tap: Import Seed Button in Onboarding Sheet
  - platform: iOS, time: 36.2s
- **import-wallet.spec.ts** — SmokeWalletPlatform: Analytics during import wallet flow does not track analytics events when opt-in to metrics is off
  - Cannot tap: Import Seed Button in Onboarding Sheet
  - platform: iOS, time: 32.5s

### wallet-platform-ios-smoke-2

- **new-wallet.spec.ts** — SmokeWalletPlatform: Analytics during new wallet flow tracks analytics events during new wallet flow
  - Cannot tap: Import Seed Button in Onboarding Sheet
  - platform: iOS, time: 35.4s
- **new-wallet.spec.ts** — SmokeWalletPlatform: Analytics during new wallet flow does not track analytics events when opt-in to metrics is off
  - Cannot tap: Import Seed Button in Onboarding Sheet
  - platform: iOS, time: 28.6s
- **trending-feed.spec.ts** — SmokeWalletPlatform: Trending Feed View All Navigation Navigate to all sections full views via View All and return to feed
  - Cannot tap: Import Seed Button in Onboarding Sheet
  - platform: iOS, time: 171.5s

## Category: `detox-element-not-found` (13 tests)

### network-abstraction-ios-smoke-1

- **permission-system-dapp-chain-switch-grant.spec.ts** — SmokeNetworkAbstractions: Chain Permission System When a dApp requests to switch to a new chain grants permission to the new chain and switches to it when approved
  - MATCHER(id == “accounts-connected-network-picker”) TIMEOUT(100ms)
  - platform: iOS, time: 92.4s
- **network-manager.spec.ts** — SmokeNetworkAbstractions: Network Manager should reflect the correct enabled networks state in the network manager
  - MATCHER(id == “accounts-connected-network-picker”) TIMEOUT(100ms)
  - platform: iOS, time: 64.0s

### network-abstraction-ios-smoke-2

- **network-manager2.spec.ts** — SmokeNetworkAbstractions: Network Manager should preserve existing enabled networks when adding a network via dapp
  - MATCHER(id == “navigate_to_edit_networks_permissions_button”) TIMEOUT(100ms)
  - platform: iOS, time: 73.2s
- **network-manager2.spec.ts** — SmokeNetworkAbstractions: Network Manager should filter tokens by selected network from list of enabled popular networks
  - MATCHER(id == “navigate_to_edit_networks_permissions_button”) TIMEOUT(100ms)
  - platform: iOS, time: 53.7s

### prediction-market-ios-smoke-1

- **predict-withdraw.spec.ts** — SmokePredictions: Predictions Withdraw withdraws from Predict balance
  - MATCHER(id == “predict-market-list-container”) TIMEOUT(100ms)
  - platform: iOS, time: 73.4s
- **predict-claim-positions.spec.ts** — SmokePredictions: Claim winnings: claim winnings via predictions section
  - MATCHER(id == “predict-market-list-container”) TIMEOUT(100ms)
  - platform: iOS, time: 93.3s

### trade-ios-smoke-1

- **gasless-swap.spec.ts** — SmokeTrade: Gasless Swap - completes a gasless 7702 ETH to MUSD swap (native source)
  - Element matcher timed out
  - platform: iOS, time: 78.8s
- **swap-deeplink-smoke.spec.ts** — SmokeTrade: Swap Deep Link Tests - Unified Bridge Experience navigate to bridge view with full parameters (USDC to USDT)
  - MATCHER(id == “bridge-confirm-button”) TIMEOUT(100ms)
  - platform: iOS, time: 62.4s
- **bridge-action-smoke.spec.ts** — SmokeTrade: Bridge functionality should bridge ETH (Mainnet) to ETH (Base Network)
  - Element matcher timed out
  - platform: iOS, time: 87.3s
- **swap-action-smoke.spec.ts** — SmokeTrade: Swap from Actions swaps ETH-&gt;USDC with custom slippage and USDC-&gt;ETH
  - Element matcher timed out
  - platform: iOS, time: 124.0s
- **stake-action-smoke.spec.ts** — SmokeTrade: Stake from Actions should be able to import stake test account with funds
  - MATCHER(id == “bridge-confirm-button”) TIMEOUT(100ms)
  - platform: iOS, time: 58.7s
- **swap-deeplink-smoke.spec.ts** — SmokeTrade: Swap Deep Link Tests - Unified Bridge Experience navigate to bridge view with no parameters
  - Element matcher timed out
  - platform: iOS, time: 48.7s
- **lending-deposit-smoke.spec.ts** — SmokeTrade: Lending Deposit from Wallet deposits USDC into Aave lending market
  - Element matcher timed out
  - platform: iOS, time: 66.1s

## Category: `port-collision` (10 tests)

### snaps-android-smoke-3

- **test-snap-bip-32.spec.ts** — SmokeSnaps: BIP-32 Snap Tests can get BIP-32 public key
  - EADDRINUSE on port 56292
  - platform: Android, time: 151.5s
- **test-snap-bip-32.spec.ts** — SmokeSnaps: BIP-32 Snap Tests can sign BIP-32 message using secp256k1
  - EADDRINUSE on port 56292
  - platform: Android, time: 151.4s
- **test-snap-bip-32.spec.ts** — SmokeSnaps: BIP-32 Snap Tests can sign BIP-32 message using ed25519Bip32
  - EADDRINUSE on port 56292
  - platform: Android, time: 151.3s
- **test-snap-bip-32.spec.ts** — SmokeSnaps: BIP-32 Snap Tests can sign BIP-32 message using secp256k1 and SRP 1
  - EADDRINUSE on port 56292
  - platform: Android, time: 151.4s
- **test-snap-bip-32.spec.ts** — SmokeSnaps: BIP-32 Snap Tests can sign BIP-32 message using secp256k1 and SRP 2
  - EADDRINUSE on port 56292
  - platform: Android, time: 151.2s
- **test-snap-bip-32.spec.ts** — SmokeSnaps: BIP-32 Snap Tests fails when choosing the invalid entropy source
  - EADDRINUSE on port 56292
  - platform: Android, time: 151.3s

### snaps-ios-smoke-2

- **test-snap-get-entropy.spec.ts** — SmokeSnaps: Get Entropy Snap Tests signs a message with the Snap entropy
  - EADDRINUSE on port 39263
  - platform: iOS, time: 150.3s
- **test-snap-get-entropy.spec.ts** — SmokeSnaps: Get Entropy Snap Tests signs a message with the Snap entropy from SRP 1 (primary)
  - EADDRINUSE on port 39263
  - platform: iOS, time: 150.3s
- **test-snap-get-entropy.spec.ts** — SmokeSnaps: Get Entropy Snap Tests signs a message with the Snap entropy from SRP 2
  - EADDRINUSE on port 39263
  - platform: iOS, time: 150.3s
- **test-snap-get-entropy.spec.ts** — SmokeSnaps: Get Entropy Snap Tests fails when choosing an invalid entropy source
  - EADDRINUSE on port 39263
  - platform: iOS, time: 150.9s

## Category: `detox-retry-exhausted` (9 tests)

### snaps-android-smoke-2

- **test-snap-multichain-provider.spec.ts** — SmokeSnaps: Multichain Provider Snap Tests can use the Multichain provider
  - Generic retry exhausted on: Description not provided
  - platform: Android, time: 81.4s
- **test-snap-get-entropy.spec.ts** — SmokeSnaps: Get Entropy Snap Tests fails when choosing an invalid entropy source
  - Generic retry exhausted on: Description not provided
  - platform: Android, time: 37.2s
- **test-snap-bip-44.spec.ts** — SmokeSnaps: BIP-44 Snap Tests fails when choosing the invalid entropy source
  - Generic retry exhausted on: Description not provided
  - platform: Android, time: 35.9s
- **test-snap-manage-state.spec.ts** — SmokeSnaps: Manage State Snap Tests connects to the State Snap
  - Generic retry exhausted on: Description not provided
  - platform: Android, time: 58.7s
- **test-snap-get-entropy.spec.ts** — SmokeSnaps: Get Entropy Snap Tests connects to the Get Entropy Snap
  - Generic retry exhausted on: Description not provided
  - platform: Android, time: 56.8s
- **test-snap-bip-44.spec.ts** — SmokeSnaps: BIP-44 Snap Tests can connect to BIP-44 snap
  - Generic retry exhausted on: Description not provided
  - platform: Android, time: 60.8s

### snaps-android-smoke-3

- **test-snap-background-events.spec.ts** — SmokeSnaps: Background Events Snap Tests shows an error when trying to schedule a background event in the past
  - Generic retry exhausted on: Description not provided
  - platform: Android, time: 34.7s
- **test-snap-ethereum-provider.spec.ts** — SmokeSnaps: Ethereum Provider Snap Tests can use the Ethereum provider
  - Generic retry exhausted on: Description not provided
  - platform: Android, time: 68.8s
- **test-snap-background-events.spec.ts** — SmokeSnaps: Background Events Snap Tests can connect to the background events Snap
  - Generic retry exhausted on: Description not provided
  - platform: Android, time: 52.2s

## Category: `detox-assertion-retry-exhausted` (6 tests)

### network-abstraction-android-smoke-1

- **permission-system-dapp-chain-switch-grant.spec.ts** — SmokeNetworkAbstractions: Chain Permission System When a dApp requests to switch to a new chain grants permission to the new chain and switches to it when approved
  - Assert element has label "l E" never satisfied
  - platform: Android, time: 73.9s
- **view-market-insights.spec.ts** — SmokeNetworkAbstractions: View Market Insights on Asset Details displays market insights content and navigates to swap
  - Assert element has label "l E" never satisfied
  - platform: Android, time: 45.8s

### network-abstraction-android-smoke-2

- **network-manager2.spec.ts** — SmokeNetworkAbstractions: Network Manager should preserve existing enabled networks when adding a network via dapp
  - Assert edit networks permissions button should show "Use your enabled networks Requesting for Polygon Mainnet" never satisfied
  - platform: Android, time: 66.3s
- **network-manager2.spec.ts** — SmokeNetworkAbstractions: Network Manager should filter tokens by selected network from list of enabled popular networks
  - Assert edit networks permissions button should show "Use your enabled networks Requesting for Polygon Mainnet" never satisfied
  - platform: Android, time: 35.2s

### prediction-market-android-smoke-1

- **predict-withdraw.spec.ts** — SmokePredictions: Predictions Withdraw withdraws from Predict balance
  - Assert Predict market list should be visible after withdraw confirmation never satisfied
  - platform: Android, time: 57.6s
- **predict-claim-positions.spec.ts** — SmokePredictions: Claim winnings: claim winnings via predictions section
  - Assert Predict market list should be visible after withdraw confirmation never satisfied
  - platform: Android, time: 59.1s

## Category: `fixture-cleanup-failure` (5 tests)

### confirmations-android-smoke-3

- **transaction-pay.spec.ts** — SmokeConfirmations: Transaction Pay deposits to predict balance
  - Cleanup helper threw
  - platform: Android, time: 53.2s
- **signatures-typed.spec.ts** — SmokeConfirmations: Typed Signature Requests should sign Typed V1 Sign message
  - Cleanup helper threw
  - platform: Android, time: 52.7s

### confirmations-ios-smoke-3

- **transaction-pay.spec.ts** — SmokeConfirmations: Transaction Pay deposits to predict balance
  - Cleanup helper threw
  - platform: iOS, time: 56.1s
- **per-dapp-selected-network.spec.ts** — SmokeConfirmations: Dapp Network Switching submits a transaction to a dapp-specific selected network
  - Cleanup helper threw
  - platform: iOS, time: 118.5s

### network-abstraction-ios-smoke-2

- **view-market-insights.spec.ts** — SmokeNetworkAbstractions: View Market Insights on Asset Details does not display entry card when feature flag is disabled
  - Cleanup helper threw
  - platform: iOS, time: 43.0s

## Category: `jest-test-timeout` (5 tests)

### prediction-market-android-smoke-1

- **predict-claim-positions.spec.ts** — SmokePredictions: Claim winnings: claim winnings via market details
  - platform: Android, time: 301.8s

### snaps-android-smoke-1

- **test-snap-preinstalled.spec.ts** — SmokeSnaps: Preinstalled Snap Tests uses `initialConnections` to allow JSON-RPC and tracks an event in Segment with `snap_trackEvent`
  - platform: Android, time: 151.5s

### snaps-android-smoke-3

- **test-snap-bip-32.spec.ts** — SmokeSnaps: BIP-32 Snap Tests can connect to BIP-32 snap
  - platform: Android, time: 151.4s

### snaps-ios-smoke-2

- **test-snap-get-entropy.spec.ts** — SmokeSnaps: Get Entropy Snap Tests connects to the Get Entropy Snap
  - platform: iOS, time: 150.5s
- **test-snap-bip-32.spec.ts** — SmokeSnaps: BIP-32 Snap Tests can connect to BIP-32 snap
  - platform: iOS, time: 85.7s

## Category: `anvil-crashed` (1 tests)

### snaps-android-smoke-3

- **test-snap-bip-32.spec.ts** — SmokeSnaps: BIP-32 Snap Tests can sign BIP-32 message using ed25519
  - Local Anvil node exited unexpectedly
  - platform: Android, time: 1.8s
