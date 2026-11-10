# Measure Warm Start: Login To Wallet Screen [scenario shadow]

Tags: @PerformanceShadow
Team: @metamask-mobile-platform
Platforms: Android

<!-- Original: tests/performance/login/launch-times/warm-start-login-to-wallet.spec.ts. The password goes in through LoginView.enterPassword and LoginView.tapLoginButton in the Secret step (never shown to the model); the clock starts when tapLoginButton returns, as in the original. The end is WalletView.accountIcon in the performance suite (wallet-account-name-button or account-picker). -->

## Steps

1. Secret: Log in to the wallet without profiling
2. Expect: the wallet total balance is visible [check: testID=total-balance-text]
3. App: arm Hermes profiling
4. App: background the app for 35 s
5. App: activate the app
6. Expect: the login password field is visible [check: label=login-password-input]
7. Secret: Unlock on the login screen with the login password
8. App: start the clock
9. Expect: the wallet account button is visible [check: any testID=wallet-account-name-button | testID=account-picker]

## Timers

- Measure from step 8 until step 9 (Android 3000 ms, iOS 2500 ms): Time since the user clicks on unlock button, until the app unlocks
