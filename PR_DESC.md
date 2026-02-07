## **Description**

This PR completes a 6-step refactor to make the perps controller layer fully portable and importable via a clean `@metamask/perps-controller` alias. The goal is to decouple the controller logic from the mobile UI layer so it can eventually be extracted into its own package (mirroring the `core` monorepo pattern).

**Why:** The perps code was tightly coupled — controllers, services, types, utils, and constants all lived under `app/components/UI/Perps/controllers/` with cross-imports between UI and controller layers. This made it impossible to extract the controller into a standalone package.

**What changed (6 incremental commits):**

1. **Move portable constants, types, and utils into `controllers/`** — Relocated shared constants (`chartConfig`, `eventNames`, `hyperLiquidConfig`, `orderTypes`, `performanceMetrics`, `perpsConfig`, `transactionsHistoryConfig`), all shared types (`config`, `hyperliquid-types`, `perps-types`, `token`, `transactionTypes`), and portable utils (`accountUtils`, `hyperLiquidAdapter`, `hyperLiquidValidation`, `idUtils`, `marketUtils`, `orderCalculations`, `sortMarkets`, `standaloneInfoClient`, `stringParseUtils`, `wait`, `rewardsUtils`, `significantFigures`, `orderBookGrouping → hyperLiquidOrderBookProcessor`) into `controllers/`.

2. **Remove re-export stubs, update imports** — Deleted the thin re-export files that previously existed under `app/components/UI/Perps/{constants,types,utils}/` and updated all UI-layer imports to point directly at `controllers/` paths.

3. **Abstract mobile services, make `controllers/` portable** — Introduced `ServiceContext` abstraction so controller-layer services no longer depend on mobile-specific infrastructure (`PerpsConnectionManager`, `TradingReadinessCache`). The mobile app injects these via the context at runtime.

4. **Move HyperLiquid services into `controllers/`** — Relocated `HyperLiquidClientService`, `HyperLiquidSubscriptionService`, `HyperLiquidWalletService`, `AccountService`, `DataLakeService`, `DepositService`, `EligibilityService`, `FeatureFlagConfigurationService`, `MarketDataService`, `RewardsIntegrationService`, `TradingService`, `TradingReadinessCache`, and `hyperLiquidOrderBookProcessor` (with tests) into the controller layer.

5. **Copy `ensureError` + move `PerpsMeasurementName`** — Copied the `ensureError` utility into controllers (avoiding a mobile-core dependency) and moved `PerpsMeasurementName` enum into `controllers/constants/performanceMetrics.ts`.

6. **Migrate all imports to `@metamask/perps-controller` alias + physical move** — Physically moved `app/components/UI/Perps/controllers/` to `app/controllers/perps/`. Added `@metamask/perps-controller` path alias in `tsconfig.json`, `babel.config.js`, `metro.config.js`, and `jest.config.js`. Updated every import across ~130 files to use the alias. Added an ESLint `no-restricted-imports` rule to enforce alias usage going forward.

## **Changelog**

CHANGELOG entry: null

## **Related issues**

Fixes: N/A — internal refactor for perps-controller portability

## **Manual testing steps**

```gherkin
Feature: Perps trading functionality unchanged after refactor

  Scenario: User opens perps market view
    Given the user has perps feature enabled
    When user navigates to the perps trading screen
    Then the market list loads correctly with live prices

  Scenario: User places a perps order
    Given the user is on a perps market detail page
    When user enters order parameters and submits
    Then the order executes successfully via HyperLiquid

  Scenario: User views open positions and orders
    Given the user has existing perps positions
    When user navigates to positions/orders tab
    Then all positions and open orders display correctly
```

## **Screenshots/Recordings**

N/A — pure refactor, no UI changes.

## **Pre-merge author checklist**

- [x] I've followed [MetaMask Contributor Docs](https://github.com/MetaMask/contributor-docs) and [MetaMask Mobile Coding Standards](https://github.com/MetaMask/metamask-mobile/blob/main/.github/guidelines/CODING_GUIDELINES.md).
- [x] I've completed the PR template to the best of my ability
- [x] I've included tests if applicable
- [x] I've documented my code using [JSDoc](https://jsdoc.app/) format if applicable
- [x] I've applied the right labels on the PR (see [labeling guidelines](https://github.com/MetaMask/metamask-mobile/blob/main/.github/guidelines/LABELING_GUIDELINES.md)). Not required for external contributors.

## **Pre-merge reviewer checklist**

- [ ] I've manually tested the PR (e.g. pull and build branch, run the app, test code being changed).
- [ ] I confirm that this PR addresses all acceptance criteria described in the ticket it closes and includes the necessary testing evidence such as recordings and or screenshots.
