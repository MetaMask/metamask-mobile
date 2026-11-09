# Swap flow - ETH to LINK, SRP 1 + SRP 2 + SRP 3 [scenario shadow]

Tags: @PerformanceShadow
Team: @swap-bridge-dev-team
Platforms: Android

## Steps

1. Tap the Swap button on the wallet home
2. Expect: the swap screen with the source amount input is visible
3. Select USDC on Ethereum as the destination token
4. Enter 0.01 as the source amount
5. Dismiss the amount keypad
6. Expect: a quote with a positive destination amount is displayed

## Timers

- Measure from step 1 until step 2 (Android 2500 ms, iOS 2000 ms): Time since the user clicks on the "Swap" button until the swap page is loaded
- Measure from step 5 until step 6 (Android 3000 ms, iOS 9000 ms): Time since the user enters the amount until the quote is displayed
