# Seedless Onboarding: Google Login New User [scenario shadow]

Tags: @PerformanceShadow
Team: @metamask-onboarding-team
Platforms: Android

<!-- Original: tests/performance/onboarding/seedless-google-onboarding.spec.ts. Runs on the E2E_MOCK_OAUTH seedless build (scenario-shadow-testmu-android-onboarding-seedless), so OAuth is the QA mock, not a real Google login. [if: seedless-new-user / seedless-existing-user] is the original isNewUser, from whichever screen the post-OAuth race saw first. The new-user end runs measureCreatePasswordToWalletHome with the timer, as the original does. -->

## Steps

1. Tap Create a new wallet on the onboarding screen [tap: testID=wallet-setup-screen-create-new-wallet-button-id]
2. Expect: the Google login button is on the onboarding sheet [check: code=google-login-button]
3. Secret: Sign in with the provider (mocked OAuth) and dismiss the update modal if present
4. App: start the clock
5. Expect: the password screen (new user) or Account found screen (existing user) is visible [check: code=seedless-post-oauth]
6. Secret: Record the post-OAuth screen TTC
7. Secret: Create the seedless wallet password [if: seedless-new-user]
8. App: start the clock [if: seedless-new-user]
9. Expect: the wallet home is visible after Create password [if: seedless-new-user] [check: code=seedless-create-password-to-wallet]
10. Secret: Record the onboarding sheet TTC and dismiss the push sheet and Predict modal [if: seedless-new-user]
11. Secret: Tap Login on the account found screen [if: seedless-existing-user]
12. App: start the clock [if: seedless-existing-user]
13. Expect: the login screen is displayed [if: seedless-existing-user] [check: code=login-screen-displayed]
14. Secret: Record the rehydrate and onboarding sheet TTC [if: seedless-existing-user]
15. Secret: Unlock with the onboarding password [if: seedless-existing-user]
16. App: start the clock [if: seedless-existing-user]
17. Expect: the wallet main screen is visible [if: seedless-existing-user] [check: code=wallet-container]

## Timers

- Measure from step 1 until step 2 (Android 2000 ms, iOS 1500 ms): Google: Tap "Create new wallet" → OnboardingSheet visible
- Measure from step 4 until step 5 (Android 5000 ms, iOS 15000 ms): Google: Tap Google login → post-OAuth screen visible
- Measure from step 8 until step 9 (Android 5000 ms, iOS 30000 ms): Google: Final onboarding action → wallet main screen visible
- Measure from step 12 until step 13 (Android 4000 ms, iOS 4000 ms): Google: Post-OAuth action → Password fields visible
- Measure from step 16 until step 17 (Android 5000 ms, iOS 30000 ms): Google: Final onboarding action → wallet main screen visible
