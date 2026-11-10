# Asset View, SRP 1 + SRP 2 + SRP 3 [scenario shadow]

Tags: @PerformanceShadow
Team: @assets-dev-team
Platforms: Android

## Steps

1. Secret: Log in to the wallet
2. Open the Tokens section on the wallet home
3. Tap ETH in the token list
4. Expect: the ETH token overview screen is visible [check: testID=token-asset-overview]

## Timers

- Measure from step 3 until step 4 (Android 4000 ms, iOS 6000 ms): Time since the user clicks on the asset view button until the user sees the token overview screen
