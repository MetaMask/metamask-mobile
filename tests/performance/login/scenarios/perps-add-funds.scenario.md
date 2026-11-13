# Perps add funds [scenario shadow]

Tags: @PerformanceShadow
Team: @mm-perps-engineering-team
Platforms: Android

<!-- Original: tests/performance/login/perps-add-funds.spec.ts. Production flags are fetched before login (scenarioTest); [if: perps-gtm-onboarding] is resolvePerpsGtmOnboardingModalEnabled, resolved after the Perps tap and before the clock, as in the original. Like the original it stops when the fee is shown; nothing is submitted. -->

## Steps

1. Secret: Log in to the wallet
2. Tap the Perpetuals section header on the wallet home (testID homepage-section-title-perps; scroll down to find it)
3. App: start the clock [if: perps-gtm-onboarding]
4. Expect: the Perps tutorial is visible [if: perps-gtm-onboarding] [check: any text="What are perps?"]
5. Tap Skip on the Perps tutorial [if: perps-gtm-onboarding] [tap: testID=perps-tutorial-skip-button]
6. Tap Add funds on the Perps screen [tap: text="Add funds"]
7. Expect: the deposit amount input is visible [check: testID=custom-amount-input]
8. Enter 1 USD on the deposit keypad to add funds [tap: testID=keypad-key-1]
9. Tap Continue on the add funds screen [tap: text=Continue]
10. Expect: the transaction fee is shown on the confirmation page [check: testID=transaction-fee]

## Timers

- Measure from step 3 until step 4 (Android 4200 ms, iOS 1500 ms): Select Perps Main Screen
- Measure from step 6 until step 7 (Android 4000 ms, iOS 5000 ms): Open Add Funds
- Measure from step 9 until step 10 (Android 7000 ms, iOS 6000 ms): Get Quote
