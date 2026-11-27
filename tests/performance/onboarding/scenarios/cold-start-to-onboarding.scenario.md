# Measure Cold Start To Onboarding Screen [scenario shadow]

Tags: @PerformanceShadow
Team: @metamask-mobile-platform
Platforms: Android

<!-- Original: tests/performance/onboarding/launch-times/cold-start-to-onboarding.spec.ts. The clock starts as the test body starts (the fixture has launched the fresh install), like the original. The in-app TTC [onboarding_landing] is read by addAppScreenTtcTimer with required: true and the same threshold. -->

## Steps

1. App: start the clock
2. Expect: the Create a new wallet button is visible [check: code=onboarding-new-wallet-button]
3. Secret: Record the in-app TTC for onboarding_landing

## Timers

- Measure from step 1 until step 2 (Android 4000 ms, iOS 3000 ms): Time since the the app is installed, until onboarding screen appears
