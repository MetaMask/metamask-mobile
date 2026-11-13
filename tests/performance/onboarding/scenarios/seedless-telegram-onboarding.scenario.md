# Seedless Onboarding: Telegram Login New User [scenario shadow]

Tags: @PerformanceShadow
Team: @metamask-onboarding-team
Platforms: Android

<!-- Original: tests/performance/onboarding/seedless-telegram-onboarding.spec.ts. Runs on the E2E_MOCK_OAUTH seedless build (scenario-shadow-testmu-android-onboarding-seedless), so OAuth is the QA mock, not a real Telegram login. [if: seedless-new-user / seedless-existing-user] is the original isNewUser, from whichever screen the post-OAuth race saw first. The new-user end runs measureCreatePasswordToWalletHome with the timer, as the original does. -->

## Steps

1. Secret: Check the onboarding password credential is present
2. Tap Create a new wallet on the onboarding screen [tap: testID=wallet-setup-screen-create-new-wallet-button-id]
3. Expect: the Telegram login button is on the onboarding sheet [check: code=telegram-login-ready]
4. Secret: Sign in with the provider (mocked OAuth) and dismiss the update modal if present
5. App: start the clock
6. Expect: the password screen (new user) or Account found screen (existing user) is visible [check: code=seedless-post-oauth]
7. Secret: Record the post-OAuth screen TTC
8. Secret: Create the seedless wallet password [if: seedless-new-user]
9. App: start the clock [if: seedless-new-user]
10. Expect: the wallet home is visible after Create password [if: seedless-new-user] [check: code=seedless-create-password-to-wallet]
11. Secret: Record the onboarding sheet TTC and dismiss the push sheet and Predict modal [if: seedless-new-user]
12. Secret: Tap Login on the account found screen [if: seedless-existing-user]
13. App: start the clock [if: seedless-existing-user]
14. Expect: the login screen is displayed [if: seedless-existing-user] [check: code=login-screen-displayed]
15. Secret: Record the rehydrate and onboarding sheet TTC [if: seedless-existing-user]
16. Secret: Unlock with the onboarding password [if: seedless-existing-user]
17. App: start the clock [if: seedless-existing-user]
18. Expect: the wallet main screen is visible [if: seedless-existing-user] [check: code=wallet-container]

## Timers

- Measure from step 2 until step 3 (Android 2000 ms, iOS 1500 ms): Telegram: Tap "Create new wallet" → OnboardingSheet visible
- Measure from step 5 until step 6 (Android 15000 ms, iOS 15000 ms): Telegram: Tap Telegram login → post-OAuth screen visible
- Measure from step 9 until step 10 (Android 5000 ms, iOS 30000 ms): Telegram: Final onboarding action → wallet main screen visible
- Measure from step 13 until step 14 (Android 4000 ms, iOS 4000 ms): Telegram: Post-OAuth action → Password fields visible
- Measure from step 17 until step 18 (Android 5000 ms, iOS 30000 ms): Telegram: Final onboarding action → wallet main screen visible
