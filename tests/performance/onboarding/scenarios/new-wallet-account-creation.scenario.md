# Account creation after fresh install [scenario shadow]

Tags: @PerformanceShadow
Team: @metamask-onboarding-team
Platforms: Android

<!-- Original: tests/performance/onboarding/new-wallet-account-creation.spec.ts. The untimed setup asserts the same screens as the original; the three timers start when the original action returns. -->

## Steps

1. Tap Create a new wallet on the onboarding screen [tap: testID=wallet-setup-screen-create-new-wallet-button-id]
2. Expect: the SRP option is on the onboarding sheet [check: code=onboarding-sheet-import]
3. Tap the SRP option on the onboarding sheet [tap: testID=onboarding-sheet-import-seed-button-id]
4. Expect: the new password field is visible [check: code=create-password-input]
5. Secret: Create the onboarding password, confirm the warning and choose Remind me later
6. Expect: the MetaMetrics screen title is visible [check: code=metametrics-screen]
7. Secret: Tap Agree on MetaMetrics and dismiss the questionnaire, push sheet, Predict and protect-wallet modals
8. Expect: the Wallet tab is visible [check: code=tab-bar-wallet]
9. App: arm Hermes profiling
10. Secret: Tap the account icon on the wallet
11. App: start the clock
12. Expect: the add wallet button is in the account list [check: code=add-wallet-button]
13. Secret: Tap Create account in the account list and dismiss the protect-wallet modal
14. App: start the clock
15. Expect: Account 2 is in the account list [check: code=account-2-in-list]
16. Secret: Tap Account 2 in the account list
17. App: start the clock
18. Expect: the account icon is visible on the wallet [check: code=account-icon]

## Timers

- Measure from step 11 until step 12 (Android 2200 ms, iOS 2000 ms): Time since the user clicks on "Account list" button until the account list is visible
- Measure from step 14 until step 15 (Android 2000 ms, iOS 1800 ms): Time since the user clicks on "Create account" button until the account is in the account list
- Measure from step 17 until step 18 (Android 3000 ms, iOS 2000 ms): Time since the user clicks on new account created until the Token list is visible
