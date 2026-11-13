# Aggregated Balance Loading Time, SRP 1 + SRP 2 + SRP 3 [scenario shadow]

Tags: @PerformanceShadow
Team: @assets-dev-team
Platforms: Android

<!-- Original: tests/performance/login/asset-balances.spec.ts. The timer starts right after login and profiling, with no user action, and ends when WalletView.waitForBalanceToStabilize returns. -->

## Steps

1. Secret: Log in to the wallet
2. App: start the clock
3. Expect: the aggregated balance has stabilized [check: code=balance-stable]

## Timers

- Measure from step 2 until step 3 (Android 20000 ms, iOS 40000 ms): Time since the user navigates to wallet tab until the balance stabilizes
