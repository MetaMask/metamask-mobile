# Money Home after fresh wallet creation with empty balance [scenario shadow]

Tags: @PerformanceShadow
Team: @mm-earn-team
Platforms: Android

<!-- Original: tests/performance/onboarding/money/money-home-empty.spec.ts. MONEY_*_USER_SRP = TEST_SRP_1 (tests/constants/money.ts). The timed end is the original measure() body; the untimed content assertions follow as a separate Expect, as in the original. -->

## Steps

1. Secret: Import the Money new-user wallet in onboarding
2. Expect: the Money tab is visible [check: code=tab-bar-money]
3. App: arm Hermes profiling
4. Secret: Tap the Money tab and dismiss Money onboarding if present
5. App: start the clock
6. Expect: the empty balance and APY have loaded [check: code=money-empty-loaded]
7. Expect: the onboarding card, enabled Send and no earnings section are shown [check: code=money-empty-content]

## Timers

- Measure from step 5 until step 6 (Android 4200 ms, iOS 60000 ms): Time since the user taps Money until content is visible
