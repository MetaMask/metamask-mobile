<!--
Please submit this PR as a draft initially.
Do not mark it as "Ready for review" until the template has been completely filled out, and PR status checks have passed at least once.
-->

## **Description**

This PR implements deeplink support for the Perps (perpetual futures) feature, enabling direct navigation to Perps markets from external sources like marketing campaigns, notifications, and social media.

The implementation supports two main deeplink types:

1. **Perps Market Overview**: Routes users to the main Perps tab (with tutorial flow for first-time users)
2. **Specific Asset Details**: Routes users directly to a specific perps asset (e.g., BTC, ETH)

## **Changelog**

CHANGELOG entry: Added deeplink support for Perps markets, allowing direct navigation to Perps tab and specific asset details

## **Related issues**

Fixes: TAT-1344

## **Manual testing steps**

### Testing Deeplinks

#### iOS Testing

```bash
# Test Perps market overview deeplink
xcrun simctl openurl booted "https://link-test.metamask.io/perps"

# Test specific asset deeplinks
xcrun simctl openurl booted "https://link-test.metamask.io/perps-asset?symbol=BTC"
xcrun simctl openurl booted "https://link-test.metamask.io/perps-asset?symbol=ETH"
xcrun simctl openurl booted "https://link-test.metamask.io/perps-asset?symbol=SOL"
```

#### Android Testing

```bash
# Test Perps market overview deeplink
adb shell am start -W -a android.intent.action.VIEW -d "https://link-test.metamask.io/perps" io.metamask.debug

# Test specific asset deeplinks
adb shell am start -W -a android.intent.action.VIEW -d "https://link-test.metamask.io/perps-asset?symbol=BTC" io.metamask.debug
adb shell am start -W -a android.intent.action.VIEW -d "https://link-test.metamask.io/perps-asset?symbol=ETH" io.metamask.debug
```

### Resetting First-Time User State

To test the tutorial flow for first-time users, you need to reset the Perps state:

1. **Via Redux DevTools (Development builds):**

   - Open the app with Redux DevTools enabled
   - Navigate to Redux state
   - Find `engine.backgroundState.PerpsController`
   - Set `isFirstTimeUser: { testnet: true, mainnet: true }`

2. **Via Settings Menu:**
   - Go to Settings → Advanced → Reset Account
   - This will reset all account data including Perps state

### Test Scenarios

```gherkin
Feature: Perps Deeplinks Navigation

  Scenario: First-time user navigates via perps deeplink
    Given the user has MetaMask Mobile installed
    And the user has never used Perps before (reset state if needed)

    When user clicks on deeplink "https://link-test.metamask.io/perps"
    Then the app opens to the Perps Tutorial screen
    And after completing or skipping the tutorial, user sees the Perps tab selected

  Scenario: Returning user navigates via perps deeplink
    Given the user has MetaMask Mobile installed
    And the user has completed the Perps tutorial

    When user clicks on deeplink "https://link-test.metamask.io/perps"
    Then the app opens directly to the Wallet home with Perps tab selected

  Scenario: User navigates to specific BTC asset via deeplink
    Given the user has MetaMask Mobile installed

    When user clicks on deeplink "https://link-test.metamask.io/perps-asset?symbol=BTC"
    Then the app opens directly to the BTC perps market details screen

  Scenario: User navigates to specific ETH asset via deeplink
    Given the user has MetaMask Mobile installed

    When user clicks on deeplink "https://link-test.metamask.io/perps-asset?symbol=ETH"
    Then the app opens directly to the ETH perps market details screen

  Scenario: User navigates with invalid asset symbol
    Given the user has MetaMask Mobile installed

    When user clicks on deeplink "https://link-test.metamask.io/perps-asset?symbol=INVALID"
    Then the app opens to the Perps tab (fallback behavior)

  Scenario: Tutorial skip navigates correctly from deeplink
    Given the user is a first-time Perps user
    And the user arrived via deeplink

    When user skips the tutorial
    Then the app navigates to Wallet home with Perps tab selected
    And the user can see the Perps markets list
```

### Expected Results

1. **First-time users**: Should see the tutorial carousel with 6 steps, then navigate to Perps tab
2. **Returning users**: Should navigate directly to Wallet home with Perps tab selected
3. **Asset deeplinks**: Should open the specific market details view
4. **Invalid symbols**: Should fallback to Perps markets list
5. **Tab selection**: The Perps tab should be visually selected and active after navigation

## **Screenshots/Recordings**

### **Before**

- No deeplink support for Perps feature
- Users had to manually navigate to Perps tab through the app

### **After**

- Direct deeplink navigation to Perps markets
- Support for specific asset deeplinks (BTC, ETH, SOL, etc.)
- Smart routing based on user state (tutorial vs direct navigation)

## **Pre-merge author checklist**

- [x] I've followed [MetaMask Contributor Docs](https://github.com/MetaMask/contributor-docs) and [MetaMask Mobile Coding Standards](https://github.com/MetaMask/metamask-mobile/blob/main/.github/guidelines/CODING_GUIDELINES.md).
- [x] I've completed the PR template to the best of my ability
- [x] I've included tests if applicable
- [x] I've documented my code using [JSDoc](https://jsdoc.app/) format if applicable
- [x] I've applied the right labels on the PR (see [labeling guidelines](https://github.com/MetaMask/metamask-mobile/blob/main/.github/guidelines/LABELING_GUIDELINES.md)). Not required for external contributors.

## **Pre-merge reviewer checklist**

- [ ] I've manually tested the PR (e.g. pull and build branch, run the app, test code being changed).
- [ ] I confirm that this PR addresses all acceptance criteria described in the ticket it closes and includes the necessary testing evidence such as recordings and or screenshots.
