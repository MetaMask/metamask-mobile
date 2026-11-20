# Money Home after importing SRP with funded balance [scenario shadow]

Tags: @PerformanceShadow
Team: @mm-earn-team
Platforms: Android

<!-- Original: tests/performance/onboarding/money/money-home-funded.spec.ts. MONEY_*_USER_SRP = TEST_SRP_3 (tests/constants/money.ts). The timed end is the original measure() body; the untimed content assertions follow as a separate Expect, as in the original. -->

## Steps

1. Secret: Import the Money funded-user wallet in onboarding
2. Expect: the Money tab is visible [check: code=tab-bar-money]
3. App: arm Hermes profiling
4. Secret: Tap the Money tab
5. App: start the clock
6. Expect: the funded balance, earnings and APY have loaded [check: code=money-funded-loaded]
7. Expect: the onboarding card, enabled Send and the earnings section are shown [check: code=money-funded-content]

## Timers

- Measure from step 5 until step 6 (Android 15600 ms, iOS 60000 ms): Time since the user taps Money tab until content is visible
