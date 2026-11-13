# Cold Start: Measure ColdStart To Login Screen [scenario shadow]

Tags: @PerformanceShadow
Team: @metamask-mobile-platform
Platforms: Android

<!-- Original: tests/performance/login/launch-times/cold-start-to-login.spec.ts. App steps call AppiumGestures.terminateApp / activateApp; the clock starts when activateApp returns, as in the original. The original never arms Hermes profiling. -->

## Steps

1. Secret: Log in to the wallet without profiling
2. Expect: the wallet total balance is visible [check: testID=total-balance-text]
3. App: terminate the app
4. App: activate the app
5. Expect: the login screen is visible [check: testID=login]

## Timers

- Measure from step 4 until step 5 (Android 3000 ms, iOS 3000 ms): Time since the the app is launched, until login screen appears
