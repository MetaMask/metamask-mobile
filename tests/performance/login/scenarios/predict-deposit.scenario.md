# Predict Deposit - Complete Flow Performance [scenario shadow]

Tags: @PerformanceShadow
Team: @team-predict
Platforms: Android

<!-- Original: tests/performance/login/predict/predict-deposit.spec.ts. Like the original it stops when the fee is shown; nothing is submitted. -->

## Steps

1. Secret: Log in to the wallet
2. Tap the Predictions section header on the wallet home (testID homepage-section-title-predictions; scroll down to find it)
3. Expect: the Predict home screen is visible [check: testID=predict-home-container]
4. Tap Add funds on the Predict home (testID predict-portfolio-action-add-funds)
5. Expect: the deposit amount input is visible [check: testID=custom-amount-input]
6. Enter 1 as the deposit amount on the keypad
7. Tap the Continue button on the deposit keypad (testID deposit-keyboard-done-button); it only opens the deposit confirmation, nothing is submitted
8. Expect: the transaction fee is shown on the confirmation page [check: testID=transaction-fee]

## Timers

- Measure from step 2 until step 3 (Android 3600 ms, iOS 8000 ms): Time since user taps Predict button until Predict Market List is displayed
- Measure from step 4 until step 5 (Android 6000 ms, iOS 1000 ms): Time since user taps Add Funds button until Predict Deposit screen is visible
- Measure from step 7 until step 8 (Android 12000 ms, iOS 4000 ms): Time since user taps Continue button until quote is displayed on confirmation page
