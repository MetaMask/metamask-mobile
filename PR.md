## **Description**

### Reason for the change

We need to add a new deeplink (`card-onboarding`) to allow marketing campaigns and external sources to direct users to the MetaMask Card onboarding flow. This deeplink intelligently routes users based on their card status.

### What's included

**1. New `card-onboarding` deeplink handler**

- Adds new deeplink action `CARD_ONBOARDING` supporting URLs like:
  - `https://link.metamask.io/card-onboarding`
  - `https://metamask.app.link/card-onboarding`
- Smart routing based on user state:
  - **Authenticated or has card-linked account**: Switches to first cardholder account → navigates to CardHome → shows toast notification
  - **Not authenticated and no card-linked account**: Navigates to CardWelcome (onboarding screen)
- Respects feature flags and geo-location restrictions before enabling
- Dispatches `setAlwaysShowCardButton(true)` to ensure card button visibility
- Full analytics tracking with `CARD_ONBOARDING_DEEPLINK` event

**2. CardHome toast notification**

- Adds route params support (`showDeeplinkToast`) to display a toast when user arrives via deeplink
- Shows "You already have a MetaMask Card linked to this account" message

**3. CardButton simplification**

- Removes the "New" badge wrapper from the CardButton component
- Simplifies the component by removing badge-related logic and state management

## **Changelog**

CHANGELOG entry: Added new card-onboarding deeplink to navigate users to the MetaMask Card feature

## **Related issues**

Fixes:

## **Manual testing steps**

```gherkin
Feature: Card Onboarding Deeplink

  Scenario: Authenticated user with card-linked account opens deeplink
    Given user has the MetaMask app installed
    And user is authenticated with the Card feature
    And user has a card-linked account

    When user opens the card-onboarding deeplink
    Then app switches to the first cardholder account
    And user is navigated to the Card Home screen
    And a toast notification is displayed saying "You already have a MetaMask Card linked to this account"

  Scenario: Authenticated user without card-linked account opens deeplink
    Given user has the MetaMask app installed
    And user is authenticated with the Card feature
    And user has no card-linked account

    When user opens the card-onboarding deeplink
    Then user is navigated to the Card Home screen
    And a toast notification is displayed

  Scenario: Unauthenticated user without card opens deeplink
    Given user has the MetaMask app installed
    And user is not authenticated with the Card feature
    And user has no card-linked account

    When user opens the card-onboarding deeplink
    Then user is navigated to the Card Welcome screen
    And no toast notification is displayed

  Scenario: User in unsupported region opens deeplink
    Given user has the MetaMask app installed
    And user is in an unsupported region
    And card experimental switch is disabled

    When user opens the card-onboarding deeplink
    Then nothing happens (deeplink is ignored)

  Scenario: Card button is always shown after deeplink
    Given user has opened the card-onboarding deeplink

    When user navigates to the wallet home screen
    Then the card button is visible in the header
```

## **Screenshots/Recordings**

### **Before**

<!-- N/A - new feature -->

### **After**

<!-- Add screenshots showing:
1. User navigating via deeplink to CardHome with toast
2. User navigating via deeplink to CardWelcome
3. Simplified CardButton without badge
-->

## **Pre-merge author checklist**

- [x] I've followed [MetaMask Contributor Docs](https://github.com/MetaMask/contributor-docs) and [MetaMask Mobile Coding Standards](https://github.com/MetaMask/metamask-mobile/blob/main/.github/guidelines/CODING_GUIDELINES.md).
- [x] I've completed the PR template to the best of my ability
- [x] I've included tests if applicable
- [x] I've documented my code using [JSDoc](https://jsdoc.app/) format if applicable
- [ ] I've applied the right labels on the PR (see [labeling guidelines](https://github.com/MetaMask/metamask-mobile/blob/main/.github/guidelines/LABELING_GUIDELINES.md)). Not required for external contributors.

## **Pre-merge reviewer checklist**

- [ ] I've manually tested the PR (e.g. pull and build branch, run the app, test code being changed).
- [ ] I confirm that this PR addresses all acceptance criteria described in the ticket it closes and includes the necessary testing evidence such as recordings and or screenshots.
