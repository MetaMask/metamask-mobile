# Onboarding Import SRP with +50 accounts, SRP 3 [scenario shadow]

Tags: @PerformanceShadow
Team: @metamask-onboarding-team
Platforms: Android

<!-- Original: tests/performance/onboarding/import-wallet.spec.ts. Each original action is a Secret code step or a pinned tap, followed by "App: start the clock" so the timer starts when the action returns, as TimerHelper.measure does; every end is the original assertion as a code check. TEST_SRP_3 and the import password never reach the model. -->

## Steps

1. App: arm Hermes profiling
2. Secret: Tap I have an existing wallet on the onboarding screen
3. App: start the clock
4. Expect: the Import using Secret Recovery Phrase option is on the onboarding sheet [check: code=onboarding-sheet-import]
5. Tap Import using Secret Recovery Phrase on the onboarding sheet [tap: testID=onboarding-sheet-import-seed-button-id]
6. Expect: the import wallet screen title is visible [check: code=import-wallet-title]
7. Secret: Enter SRP 3 and continue on the import screen
8. App: start the clock
9. Expect: the new password field is visible [check: code=create-password-input]
10. Secret: Create the import password and confirm the warning
11. App: start the clock
12. Expect: the MetaMetrics screen title is visible [check: code=metametrics-screen]
13. Secret: Tap I agree on MetaMetrics and dismiss the questionnaire, push sheet and Predict modal
14. App: start the clock
15. Expect: the wallet header is visible [check: code=wallet-header-60s]

## Timers

- Measure from step 3 until step 4 (Android 1800 ms, iOS 1500 ms): Time since the user clicks on "Create new wallet" button until "Social sign up" is visible
- Measure from step 5 until step 6 (Android 2000 ms, iOS 2000 ms): Time since the user clicks on "Import using SRP" button until SRP field is displayed
- Measure from step 8 until step 9 (Android 1500 ms, iOS 1000 ms): Time since the user clicks on "Continue" button on SRP screen until Password fields are visible
- Measure from step 11 until step 12 (Android 3000 ms, iOS 2000 ms): Time since the user clicks on "Create Password" button until Metrics screen is displayed
- Measure from step 14 until step 15 (Android 2400 ms, iOS 21000 ms): Time since the user clicks on "Done" button until ETH and BTC are visible
