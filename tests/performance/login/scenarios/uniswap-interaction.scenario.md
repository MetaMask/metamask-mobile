# Connect to Uniswap dapp, edit accounts, choose another account, and skip Solana popup [scenario shadow]

Tags: @PerformanceShadow
Team: @metamask-mobile-platform
Platforms: Android

<!-- Original: tests/performance/login/uniswap-interaction.spec.ts, which is perfTest.skip; this scenario is registered as skipped too (see the spec). The browser, web-context and deeplink parts run the original helpers as code steps; the timers start and stop around the same calls (metamaskTimer around unlockIfLockScreenVisible, connectTimer around switchToMobileBrowser + isUniswapDisplayed). Android path only. -->

## Steps

1. Secret: Log in to the wallet without profiling
2. Secret: Open Uniswap in the mobile browser and start Connect with MetaMask
3. App: arm Hermes profiling
4. Secret: Pick MetaMask in the Uniswap wallet list and open the deeplink
5. App: start the clock
6. Expect: MetaMask is open and unlocked [check: code=unlock-if-lock-screen]
7. Secret: Edit accounts, update them and tap Connect in MetaMask
8. App: start the clock
9. Expect: Uniswap is displayed in the mobile browser [check: code=uniswap-displayed]

## Timers

- Measure from step 5 until step 6 (Android 22000 ms, iOS 18000 ms): Time since the user selects Metamask until Metamask app is opened
- Measure from step 8 until step 9 (Android 5000 ms, iOS 15000 ms): Time since the user taps Connect in MetaMask until Uniswap is displayed
