AVAILABLE E2E TEST TAGS (the only valid E2E tags):

- SmokeAccounts: account security, SRP reveal/export, multi-account management
- SmokeConfirmations: transaction/signature confirmations, approvals, gas flows
- SmokeIdentity: profile sync, account/contact sync flows
- SmokeNetworkAbstractions: network manager, chain permissions, selector flows
- SmokeNetworkExpansion: Solana and multi-chain provider behavior
- SmokeTrade: swap/bridge/staking trade flows
- SmokeWalletPlatform: trending, activity, core wallet platform behavior
- SmokeCard: card home/add-funds/management integration
- SmokePerps: perps add-funds and account trading flows
- SmokeRamps: fiat on-ramp/off-ramp flows
- SmokeMultiChainAPI: CAIP-25 wallet session APIs and permission updates
- SmokePredictions: prediction lifecycle and related balances/activities
- FlaskBuildTests: Snaps functionality and Flask-specific behavior

TAG DEPENDENCY RULES:

- If selecting `SmokeTrade` for swap/bridge flows, also include `SmokeConfirmations`.
- If selecting `SmokeNetworkExpansion` for Solana signing/transactions, also include `SmokeConfirmations`.
- For Snaps-related changes, include `FlaskBuildTests`.

AVAILABLE PERFORMANCE TAGS:

- @PerformanceAccountList: account selector/list rendering and dismissal performance
- @PerformanceOnboarding: wallet setup/onboarding performance
- @PerformanceLogin: unlock/login/session restoration performance
- @PerformanceSwaps: swap flow performance
- @PerformanceLaunch: cold/warm launch startup performance
- @PerformanceAssetLoading: token/NFT/balance loading performance
- @PerformancePredict: prediction market loading and interaction performance
- @PerformancePreps: perps market and order flow performance

PERFORMANCE SELECTION NOTES:

- Use an empty array when no meaningful performance risk is introduced.
- For broad shared-surface changes or uncertainty, be conservative and include relevant performance tags.
