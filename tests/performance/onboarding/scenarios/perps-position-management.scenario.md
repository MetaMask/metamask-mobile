# Perps open position and close it [scenario shadow]

Tags: @PerformanceShadow
Team: @mm-perps-engineering-team
Platforms: Android

<!-- Original: tests/performance/onboarding/perps-position-management.spec.ts (onboarding app, TEST_SRP_4). It PLACES A REAL PERPS ORDER and closes it, so the spec registers this scenario as skipped until the user explicitly approves a run. All Page Object calls of the original run as code steps; timers start when the same calls return. Difference: production flags are fetched before login (scenarioTest) instead of after the Perps tap; that time is not inside any timer. -->

## Steps

1. Secret: Import the SRP 4 wallet in onboarding and select the account for this device
2. App: arm Hermes profiling
3. Secret: Scroll to and tap the Perpetuals section on the wallet home
4. App: start the clock [if: perps-gtm-onboarding]
5. Expect: the Perps tutorial is visible [if: perps-gtm-onboarding] [check: any text="What are perps?"]
6. Secret: Dismiss the Perps tutorial if present [if: perps-gtm-onboarding]
7. App: start the clock
8. Expect: the Perps market list is visible [check: testID=perps-market-withdraw-button]
9. Secret: Tap the BTC market row
10. App: start the clock
11. Expect: the BTC market details are visible [check: testID=perps-market-header-asset-name]
12. Secret: Close an already open position if there is one
13. Secret: Tap Long on the market details
14. App: start the clock
15. Expect: the order screen is visible [check: testID=perps-order-view-place-order-button]
16. Secret: Set 40x leverage and 10 USD and place the order with real funds
17. App: start the clock
18. Expect: the position is open [check: testID=perps-market-details-close-button]
19. Secret: Close the position

## Timers

- Measure from step 4 until step 5 (Android 2000 ms, iOS 2000 ms): Perps tutorial screen visible
- Measure from step 7 until step 8 (Android 2400 ms, iOS 7500 ms): Market list screen visible
- Measure from step 10 until step 11 (Android 3000 ms, iOS 10000 ms): Market Details Screen
- Measure from step 14 until step 15 (Android 5000 ms, iOS 3000 ms): Open Order Screen
- Measure from step 17 until step 18 (Android 14000 ms, iOS 10500 ms): Position opened
