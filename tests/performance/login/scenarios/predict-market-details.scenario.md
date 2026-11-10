# Predict Market Details - Complete Flow Performance [scenario shadow]

Tags: @PerformanceShadow
Team: @team-predict
Platforms: Android

<!-- Original: tests/performance/login/predict/predict-market-details.spec.ts -->
<!-- The original's 4th timer (Outcomes tab) only runs when the market has an Outcomes tab; scenarios have no conditional steps, so it is not migrated. -->

## Steps

1. Secret: Log in to the wallet
2. Tap the Predictions section header on the wallet home (testID homepage-section-title-predictions; scroll down to find it)
3. Expect: the Predict home screen is visible [check: testID=predict-home-container]
4. Tap the Politics category tile on the Predict home (testID predict-home-categories-tile-politics; scroll down to find it) [check: testID=predict-feed-view-container]
5. Tap market card 1 in the feed (testID predict-feed-view-market-card-1)
6. Expect: the market details screen is visible [check: testID=predict-market-details-screen]
7. Tap the About tab (testID predict-market-details-tab-bar-tab-about)
8. Expect: the About tab content is visible [check: testID=predict-market-details-about-tab-content]

## Timers

- Measure from step 2 until step 3 (Android 5000 ms, iOS 8000 ms): Time since user taps Predict button until Predict Market List is displayed
- Measure from step 5 until step 6 (Android 1800 ms, iOS 1500 ms): Time since user taps market card until Market Detail screen is visible
- Measure from step 7 until step 8 (Android 2500 ms, iOS 750 ms): Time since user taps About tab until About tab is visible
