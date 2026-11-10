# Cold Start after importing a wallet [scenario shadow]

Tags: @PerformanceShadow
Team: @metamask-mobile-platform
Platforms: Android

<!-- Original: tests/performance/onboarding/launch-times/cold-start-after-wallet-import.spec.ts. The clock starts when loginToAppPlaywright({ scenarioType: "onboarding" }) returns, as in the original. -->

## Steps

1. Secret: Import the SRP 3 wallet in onboarding
2. App: skip Hermes collection until restart
3. App: terminate the app
4. App: activate the app
5. Expect: the login button is visible [check: code=login-button]
6. Secret: Log in to the wallet as an onboarding user
7. App: start the clock
8. Expect: the wallet header is visible [check: code=wallet-header]

## Timers

- Measure from step 7 until step 8 (Android 5000 ms, iOS 12000 ms): Time since the user clicks on unlock button, until the app unlocks
