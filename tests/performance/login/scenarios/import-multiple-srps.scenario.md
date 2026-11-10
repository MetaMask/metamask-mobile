# Import SRP with +50 accounts, SRP 1, SRP 2, SRP 3 [scenario shadow]

Tags: @PerformanceShadow
Team: @accounts-team
Platforms: Android

<!-- Original: tests/performance/login/import-multiple-srps.spec.ts. Needs TEST_SRP_2 (the Secret step fails without it, like the original). The second SRP is typed by ImportWalletView in the Secret step and never shown to the model; the clock starts when tapContinueButton returns. -->

## Steps

1. Secret: Log in to the wallet
2. Tap the account picker at the top of the wallet (testID wallet-account-name-button or account-picker)
3. Expect: the account list is visible [check: any testID=account-hub-add-wallet-button | testID=account-list-add-account-button]
4. Expect: account sync has completed [check: code=account-sync-complete]
5. Tap the Add wallet button in the account list (testID account-hub-add-wallet-button or account-list-add-account-button)
6. Expect: the add account sheet shows Import a Secret Recovery Phrase [check: testID=add-account-srp-account]
7. Tap Import a Secret Recovery Phrase [tap: testID=add-account-srp-account]
8. Expect: the import SRP screen is visible [check: code=import-srp-screen]
9. Secret: Enter the second SRP and continue
10. App: start the clock
11. Expect: the wallet main screen is visible [check: testID=wallet-header-root]

## Timers

- Measure from step 2 until step 3 (Android 3000 ms, iOS 2500 ms): Time since the user clicks on "Account list" button until the account list is visible
- Measure from step 5 until step 6 (Android 1500 ms, iOS 1000 ms): Time since the user clicks on "Add account" button until the next modal is visible
- Measure from step 7 until step 8 (Android 1700 ms, iOS 1700 ms): Time since the user clicks on "Import SRP" button until SRP field is displayed
- Measure from step 10 until step 11 (Android 2500 ms, iOS 5000 ms): Time since the user clicks on "Continue" button on SRP screen until Wallet main screen is visible
