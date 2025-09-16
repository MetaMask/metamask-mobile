## **Description**

This PR implements MetaMask Points rewards integration for Perps trading, including tier-based fee discounts and points estimation display. Users now see their estimated points earnings and receive fee discounts based on their MetaMask Points tier before executing trades.

### What is the reason for the change?

- TAT-1221: Users need tier-based MetaMask builder fee discounts (Tier 1-3: 10bps, Tier 4-5: 5bps, Tier 6-7: 3.5bps)
- TAT-1223: Users need to see estimated points earnings before trading

### What is the improvement/solution?

- Integrated RewardsController for fee discount and points estimation
- Added RewardPointsDisplay component with fox icon animation states
- Implemented fee discount visualization with fox icon in fee row
- Added comprehensive error handling with tooltips
- Supports development simulation with magic numbers (41, 42, 43)

## **Changelog**

CHANGELOG entry: Added MetaMask Points rewards integration to Perps trading with tier-based fee discounts and points estimation display

## **Related issues**

Fixes: TAT-1221, TAT-1223

## **Manual testing steps**

```gherkin
Feature: MetaMask Points Rewards Integration

  Scenario: User sees fee discount for their tier
    Given user has MetaMask Points tier 4-5
    And user is on Perps order view with valid order amount

    When user enters order details
    Then user sees orange fox icon with "-X%" discount in fee row
    And total fee reflects the discount amount

  Scenario: User sees estimated points for trade
    Given user has opted into rewards program
    And user is on Perps order view

    When user enters valid order amount and leverage
    Then user sees orange fox icon with estimated points number
    And points animate on value changes (refresh state)

  Scenario: User sees error state handling
    Given rewards API is unavailable

    When user attempts to view rewards information
    Then user sees greyed out fox icon with "Couldn't load" text
    And user can tap info icon to see error details

  Scenario: Development simulation testing
    Given __DEV__ mode is enabled

    When user enters amount "41"
    Then user sees simulated 20% fee discount

    When user enters amount "42"
    Then user sees error state

    When user enters amount "43"
    Then user sees loading state
```

## **Screenshots/Recordings**

### **Before**

- No rewards integration
- Standard fees without discounts
- No points estimation

### **After**

- Fee discount displayed with fox icon and percentage
- Points estimation with animated fox icon
- Error states with tooltips
- Proper alignment and design system compliance

## **Pre-merge author checklist**

- [x] I've followed [MetaMask Contributor Docs](https://github.com/MetaMask/contributor-docs) and [MetaMask Mobile Coding Standards](https://github.com/MetaMask/metamask-mobile/blob/main/.github/guidelines/CODING_GUIDELINES.md).
- [x] I've completed the PR template to the best of my ability
- [x] I've included tests if applicable
- [x] I've documented my code using [JSDoc](https://jsdoc.app/) format if applicable
- [x] I've applied the right labels on the PR (see [labeling guidelines](https://github.com/MetaMask/metamask-mobile/blob/main/.github/guidelines/LABELING_GUIDELINES.md)). Not required for external contributors.

## **Pre-merge reviewer checklist**

- [ ] I've manually tested the PR (e.g. pull and build branch, run the app, test code being changed).
- [ ] I confirm that this PR addresses all acceptance criteria described in the ticket it closes and includes the necessary testing evidence such as recordings and or screenshots.

---

## **Technical Implementation Details**

### **Key Components Added:**

- `RewardPointsDisplay`: Handles points display with fox icon animation states
- `FoxIcon`: Lightweight SVG fox icon for fee discount display
- `usePerpsRewards`: Hook for rewards state management
- Enhanced `usePerpsOrderFees`: Integrated with RewardsController

### **Architecture:**

- Uses RewardsController methods as specified:
  - `RewardsController:getPerpsDiscountForAccount` for fee discounts
  - `RewardsController:estimatePoints` for points estimation
- Proper caching implementation for API calls
- Feature flag controlled (`selectRewardsEnabledFlag`)
- Design system compliant (proper TextVariants, IconColors, etc.)

### **Animation States:**

- **Preload**: Empty fox icon, no points visible
- **Loading**: Fox icon with shimmer animation
- **Loaded**: Active fox icon with points and discount
- **Refresh**: Fox spins to reveal updated points
- **Error**: Greyed out fox with error tooltip

### **Development Simulation:**

- Amount `41`: Simulates 20% fee discount
- Amount `42`: Simulates error state
- Amount `43`: Simulates loading state
