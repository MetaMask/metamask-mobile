# Measure Warm Start: Warm Start to Login Screen [scenario shadow]

Tags: @PerformanceShadow
Team: @metamask-mobile-platform
Platforms: Android

<!-- Original: tests/performance/login/launch-times/warm-start-to-login.spec.ts. Login, arm Hermes profiling (done by the login Secret step, same order), background 40 s, activate; the clock starts when activateApp returns. -->

## Steps

1. Secret: Log in to the wallet
2. App: background the app for 40 s
3. App: activate the app
4. Expect: the login screen is visible [check: testID=login]

## Timers

- Measure from step 3 until step 4 (Android 4000 ms, iOS 2500 ms): Time since the user open the app again and the login screen appears
