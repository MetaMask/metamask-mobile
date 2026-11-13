# Rewards tab time-to-content (onboarding or dashboard) [scenario shadow]

Tags: @PerformanceShadow
Team: @performance-team
Platforms: Android

<!-- Original: tests/performance/login/rewards-tab-time-to-content.spec.ts (waitForFirstSuccessful of three elements). -->

## Steps

1. Secret: Log in to the wallet
2. Tap the Rewards tab in the bottom tab bar [tap: testID=tab-bar-item-Rewards]
3. Expect: Rewards content is visible (onboarding, dashboard or the Add accounts modal) [check: any testID=onboarding-step-container | testID=rewards-view-title | label="Add accounts"]

## Timers

- Measure from step 2 until step 3 (Android 3000 ms, iOS 8000 ms): Time since the user taps Rewards until Rewards content is visible (onboarding or dashboard)
