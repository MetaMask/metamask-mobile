# Predict Available Balance - Complete Flow Performance [scenario shadow]

Tags: @PerformanceShadow
Team: @team-predict
Platforms: Android

<!-- Original: tests/performance/login/predict/predict-available-balance.spec.ts -->

## Steps

1. Secret: Log in to the wallet
2. Tap the Predictions section header on the wallet home (testID homepage-section-title-predictions; scroll down to find it)
3. Expect: the Predict home screen is visible [check: testID=predict-home-container]

## Timers

- Measure from step 2 until step 3 (Android 2400 ms, iOS 4500 ms): Time since user taps Predict button until Available Balance is displayed
