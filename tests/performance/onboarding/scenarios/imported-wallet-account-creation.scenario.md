# Account creation with 50+ accounts, SRP 1 + SRP 2 + SRP 3 [scenario shadow]

Tags: @PerformanceShadow
Team: @metamask-onboarding-team
Platforms: Android

<!-- Original: tests/performance/onboarding/imported-wallet-account-creation.spec.ts (test.skip). Skipped like the original. The original timers have no threshold. -->

## Steps

1. Secret: Import the SRP 2 wallet in onboarding
2. App: arm Hermes profiling
3. Secret: Tap the account icon on the wallet
4. App: start the clock
5. Expect: the account list is visible [check: code=account-list]
6. Secret: Tap Add account in the account list
7. App: start the clock
8. Expect: the SOL token row is visible [check: code=token-row-sol]

## Timers

- Measure from step 4 until step 5 (no threshold): Time since the user clicks on "Account list" button until the account list is visible
- Measure from step 7 until step 8 (no threshold): Time since the user clicks on new account created until the Token list is visible
