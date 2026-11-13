# Swap flow - ETH to LINK, SRP 1 + SRP 2 + SRP 3 [scenario shadow]

Tags: @PerformanceShadow
Team: @swap-bridge-dev-team
Platforms: Android

## Steps

1. Secret: Log in to the wallet
2. Tap the Swap button on the wallet home
3. Expect: the swap screen with the source amount input is visible [check: testID=source-token-area-input]
4. Select USDC on Ethereum as the destination token
5. Enter 0.01 as the source amount
6. Dismiss the amount keypad
7. Expect: a quote with a positive destination amount is displayed [check: testID=dest-token-area-input text=/^\s*\+?(?:\d*[1-9]|\d*\.\d*[1-9])/]

## Timers

- Measure from step 2 until step 3 (Android 2500 ms, iOS 2000 ms): Time since the user clicks on the "Swap" button until the swap page is loaded
- Measure from step 6 until step 7 (Android 3000 ms, iOS 9000 ms): Time since the user enters the amount until the quote is displayed
