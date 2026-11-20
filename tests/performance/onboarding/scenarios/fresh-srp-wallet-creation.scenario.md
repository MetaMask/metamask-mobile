# Fresh SRP wallet creation performance [scenario shadow]

Tags: @PerformanceShadow
Team: @metamask-onboarding-team
Platforms: Android

<!-- Original: tests/performance/onboarding/fresh-srp-wallet-creation.spec.ts. The SRP option on the sheet starts a fresh SRP creation when entered via "Create a new wallet" (see the original). The post-onboarding transitions run measureFreshSrpPostOnboarding, moved unchanged into helpers/freshSrpPostOnboarding.ts; it never fails the test, as in the original. -->

## Steps

1. Expect: the Create a new wallet button is visible [check: code=onboarding-new-wallet-button-60s]
2. App: arm Hermes profiling
3. Tap Create a new wallet on the onboarding screen [tap: testID=wallet-setup-screen-create-new-wallet-button-id]
4. Expect: the SRP option is on the onboarding sheet [check: code=onboarding-sheet-import]
5. Tap the SRP option on the onboarding sheet [tap: testID=onboarding-sheet-import-seed-button-id]
6. Expect: the password screen is visible [check: code=create-password-visible]
7. Secret: Create the onboarding password and confirm the warning
8. App: start the clock
9. Expect: the wallet backup screen is visible [check: code=remind-me-later-30s]
10. Secret: Tap Remind me later on the wallet backup screen
11. App: start the clock
12. Expect: the MetaMetrics screen title is visible [check: code=metametrics-screen-30s]
13. Secret: Measure the post-onboarding transitions from MetaMetrics to a usable wallet

## Timers

- Measure from step 3 until step 4 (Android 1800 ms, iOS 1500 ms): Time since the user taps "Create a new wallet" until the onboarding sheet is visible
- Measure from step 5 until step 6 (Android 2000 ms, iOS 1500 ms): Time since the user selects SRP wallet creation until the password fields are visible
- Measure from step 8 until step 9 (Android 7000 ms, iOS 5000 ms): Time since the user taps "Create Password" until the wallet backup screen is visible
- Measure from step 11 until step 12 (Android 2500 ms, iOS 2000 ms): Time since the user taps "Remind me later" until the MetaMetrics screen is visible
