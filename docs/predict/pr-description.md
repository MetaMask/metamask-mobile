## **Description**

Migrate the Predict Buy and Sell preview screens from full-screen navigation routes into BottomSheet wrappers, gated behind the `predictBottomSheet` LaunchDarkly feature flag. When the flag is OFF, the existing full-screen navigation flow is preserved with zero behavioral changes.

### What changed

**BottomSheet wrapper (`PredictPreviewSheet`)**

- Added `renderHeader` prop for custom header content (used by the sell sheet for richer cashout info), falling back to the default icon+title+subtitle layout (used by the buy sheet).
- Added `isFullscreen` prop so each sheet can control its height. The buy sheet uses fullscreen (for keypad/inputs), while the sell sheet auto-sizes to content.

**Buy sheet (`PredictBuyWithAnyToken`)**

- Renders inside `PredictPreviewSheet` when the flag is ON.
- Redesigned bottom content layout for sheet mode: Pay with row above Total, quick amount buttons always visible, simplified "Buy Yes" action button label, border and margin polish.
- Fixed approval request lifecycle in `usePredictBuyActions` for sheet mode (re-init fallback when approval is missing).
- Fixed auto-revert bug in `usePredictBuyConditions` that immediately reverted payment token selection when amount was 0.

**Sell sheet (`PredictSellPreview`)**

- Renders inside `PredictPreviewSheet` when the flag is ON with `isFullscreen={false}`.
- The icon+title+cashout_info row is shown in the sheet header via `renderHeader`, and hidden from the body to avoid duplication.
- Price/shares/PnL section moved from center (full-screen mode) to the bottom content area (sheet mode).
- Added `containerSheet` style variant (no `flex: 1`) so content auto-sizes within the non-fullscreen sheet.

**Context and state management (`PredictPreviewSheetContext`)**

- Central provider manages both buy and sell sheet refs, params, and open/close lifecycle.
- Feature flag check determines whether to navigate (old flow) or open a sheet (new flow).
- Extracted `SellSheetHeader` component from inline render prop for readability.

**Code quality**

- Removed 17 leftover `console.log('=== DEBUG ===')` statements from `usePredictBuyActions.ts` and `PredictController.ts`.
- Replaced raw `View` with design-system `Box` in `PredictQuickAmounts.tsx`.
- Extracted `getCashoutInfoText` helper in `format.ts` to DRY up duplicated cashout info string logic.
- Fixed 2 pre-existing test mismatches in `usePredictBuyActions.test.ts`.

**Documentation**

- Added comprehensive Predictions architecture guide (`docs/predict/predictions-comprehensive-guide.md`).
- Added ticket documentation (`docs/predict/tickets/buy-sell-bottomsheet-migration.md`).

## **Changelog**

CHANGELOG entry: null

## **Related issues**

Refs: PRED-707

## **Manual testing steps**

```gherkin
Feature: Predict Buy/Sell BottomSheet Migration

  Scenario: Buy prediction via bottom sheet (flag ON)
    Given the predictBottomSheet feature flag is enabled
    And the user is on a prediction market details page

    When user taps a "Yes" or "No" outcome button
    Then a bottom sheet opens with the buy preview content
    And the sheet header shows the outcome icon, title, and odds
    And the user can enter an amount, select payment method, and tap "Buy Yes"
    And the order is placed successfully
    And the sheet closes after success

  Scenario: Sell position via bottom sheet (flag ON)
    Given the predictBottomSheet feature flag is enabled
    And the user has an active position on a market

    When user taps "Cash out" on their position
    Then a content-fitted bottom sheet opens (not fullscreen)
    And the sheet header shows the position icon, title, and cashout info
    And the body shows the current value, shares, PnL, and Cash out button
    And tapping "Cash out" places the sell order and closes the sheet

  Scenario: Buy prediction via full-screen navigation (flag OFF)
    Given the predictBottomSheet feature flag is disabled
    And the user is on a prediction market details page

    When user taps a "Yes" or "No" outcome button
    Then the app navigates to the full-screen BuyPreview screen
    And the existing layout and behavior are unchanged

  Scenario: Sell position via full-screen navigation (flag OFF)
    Given the predictBottomSheet feature flag is disabled
    And the user has an active position on a market

    When user taps "Cash out" on their position
    Then the app navigates to the full-screen SellPreview screen
    And the existing layout and behavior are unchanged

  Scenario: Change payment method in buy sheet (flag ON)
    Given the predictBottomSheet feature flag is enabled
    And the buy bottom sheet is open

    When user taps the Pay with row and selects USDC
    Then the payment method updates to USDC and stays selected
    And the fee summary updates accordingly
```

## **Screenshots/Recordings**

### **Before**

<!-- Full-screen buy/sell preview navigation (flag OFF) - add screenshots -->

### **After**

<!-- Bottom sheet buy/sell preview (flag ON) - add screenshots -->

## **Pre-merge author checklist**

- [x] I've followed [MetaMask Contributor Docs](https://github.com/MetaMask/contributor-docs) and [MetaMask Mobile Coding Standards](https://github.com/MetaMask/metamask-mobile/blob/main/.github/guidelines/CODING_GUIDELINES.md).
- [x] I've completed the PR template to the best of my ability
- [x] I've included tests if applicable
- [x] I've documented my code using [JSDoc](https://jsdoc.app/) format if applicable
- [x] I've applied the right labels on the PR (see [labeling guidelines](https://github.com/MetaMask/metamask-mobile/blob/main/.github/guidelines/LABELING_GUIDELINES.md)). Not required for external contributors.

## **Pre-merge reviewer checklist**

- [ ] I've manually tested the PR (e.g. pull and build branch, run the app, test code being changed).
- [ ] I confirm that this PR addresses all acceptance criteria described in the ticket it closes and includes the necessary testing evidence such as recordings and or screenshots.
