## **Description**

This PR fixes a critical bug in MetaMask Mobile Perps charts where the 30d candle period option was causing chart breakage for all tokens. The fix removes the problematic 30d option from the UI and improves the default user experience by highlighting the 1min period instead of 3min for better granularity.

**What is the reason for the change?**
The 30d candle period was breaking charts for all tokens in MetaMask Mobile Perps, making the feature unusable.

**What is the improvement/solution?**
- Removed the 30d candle period option from the UI to prevent chart breakage
- Changed the default candle period from 3min to 1min for better granularity and user experience
- Maintained backward compatibility by keeping the ONE_MONTH enum for internal calculations

## **Changelog**

CHANGELOG entry: Fixed Perps chart breakage by removing 30d candle period option and improved default granularity with 1min period

## **Related issues**

Fixes: TAT-1639

## **Manual testing steps**

```gherkin
Feature: Perps Chart Candle Period Selection

  Scenario: user selects candle periods from the chart
    Given user is on the Perps trading page with a chart displayed
    And the chart is showing candle data

    When user taps on the candle period selector
    Then the 30d option should not be visible in the period list
    And the 1min period should be highlighted as the default selection
    And all other periods (3m, 5m, 15m, 30m, 1h, 2h, 4h, 8h, 12h, 1d, 2d, 7d) should be available

  Scenario: user opens the extended candle period bottom sheet
    Given user is on the Perps trading page with a chart displayed

    When user taps on "More" in the candle period selector
    Then the bottom sheet should open with period categories
    And the "Days" section should contain only 1d, 2d, and 7d options
    And the 30d option should not appear in any section
    And the chart should not break when selecting any available period
```

## **Screenshots/Recordings**

### **Before**
- 30d option was visible in candle period selector and caused chart breakage
- 3min was the default highlighted period

### **After**
- 30d option removed from all UI components
- 1min is now the default highlighted period
- Chart functions properly with all remaining period options

## **Pre-merge author checklist**

- [x] I've followed [MetaMask Contributor Docs](https://github.com/MetaMask/contributor-docs) and [MetaMask Mobile Coding Standards](https://github.com/MetaMask/metamask-mobile/blob/main/.github/guidelines/CODING_GUIDELINES.md).
- [x] I've completed the PR template to the best of my ability
- [x] I've included tests if applicable
- [x] I've documented my code using [JSDoc](https://jsdoc.app/) format if applicable
- [x] I've applied the right labels on the PR (see [labeling guidelines](https://github.com/MetaMask/metamask-mobile/blob/main/.github/guidelines/LABELING_GUIDELINES.md)). Not required for external contributors.

## **Pre-merge reviewer checklist**

- [ ] I've manually tested the PR (e.g. pull and build branch, run the app, test code being changed).
- [ ] I confirm that this PR addresses all acceptance criteria described in the ticket it closes and includes the necessary testing evidence such as recordings and or screenshots.