# Animated amount display migration

## What changed

The app now has a shared visual-only `AnimatedAmountDisplay` component at:

`app/component-library/components-temp/AnimatedAmountDisplay/`

It owns:

- numeric digit animation through `AnimatedNumericText`;
- shared cursor blinking;
- prefix, amount, cursor, and suffix layout;
- shared numeric reflow transitions;
- reduced-motion handling;
- optional pressable and loading rendering.

Each feature still owns formatting, amount state, validation, keypad behavior,
quotes, Max/percentage actions, and submission logic.

Migrated displays:

- Send amount entry;
- Quick Buy amount display;
- Ramp V2 and Ramp Aggregator amount displays;
- confirmation custom amount / MetaMask Pay amount;
- Predict amount display;
- Perps amount display and withdrawal amount;
- Earn amount display;
- Price Alerts amount display.

Bridge and Swaps remain on their existing native `TextInput` implementation
because selection, focus, and native caret behavior must be preserved.

The shared blinking cursor is re-exported from the existing Ramp hook path so
current consumers retain their imports while using the common implementation.

## Manual testing

Run the relevant app build and verify the following flows. Amount formatting,
cursor position, digit animation, loading states, error colors, and press
behavior should remain correct.

```gherkin
Feature: Shared animated amount displays

  Background:
    Given I am logged into MetaMask Mobile
    And I have a wallet with at least one funded account

  Scenario: user enters an amount in Send
    Given I am on the Send amount screen
    When I enter several digits with the keypad
    Then each digit should appear in order
    And the cursor should remain immediately after the amount
    And the token symbol should remain after the cursor

  Scenario: user changes Send amount using Max
    Given I am on the Send amount screen
    When I tap Max
    Then the amount should update to the full available value
    And the replacement should use the shared numeric animation

  Scenario: user enters an amount in Quick Buy
    Given I am on the Quick Buy amount screen
    When I open the keypad and enter an amount
    Then the primary amount should animate as digits change
    And the currency or token symbol should remain on the correct side
    And the quote loading state should still show its skeleton

  Scenario: user enters an amount in Ramp
    Given I am on a Ramp amount screen
    When I enter an amount and change the selected currency
    Then the amount should retain the locale decimal separator
    And the cursor should remain after the editable amount
    And validation errors should use the error color

  Scenario: user enters a confirmation payment amount
    Given a confirmation requests a custom payment amount
    When I edit the amount
    Then the amount should preserve its displayed decimals
    And the loading skeleton should replace the amount while loading
    And the cursor should only be visible during amount entry

  Scenario: user enters a Predict amount
    Given I am on a Predict amount screen
    When I enter a decimal amount
    Then the dollar prefix should remain visible
    And the cursor should appear only while the amount is active
    And pressing the amount should still open the amount editor when supported

  Scenario: user enters a Perps amount
    Given I am on a Perps order, margin, or withdrawal screen
    When I enter an amount
    Then the amount should retain Perps fiat or token formatting
    And loading, warning, error, and available-balance content should remain visible
    And the cursor should appear only while the amount is active

  Scenario: user enters an Earn amount
    Given I am on an Earn deposit or withdrawal screen
    When I switch between fiat and token amounts
    Then the amount and ticker should remain aligned
    And the stablecoin lending cursor should blink while editing
    And the currency toggle and maximum-withdrawal content should remain usable

  Scenario: user creates a price alert
    Given I am creating an absolute or percentage price alert
    When I enter a high-precision value
    Then the value should not be rounded or converted through a JavaScript number
    And the prefix and suffix should remain visible
    And the amount should continue fitting within the available width

  Scenario: user uses Bridge or Swaps
    Given I am editing a Bridge or Swaps amount
    When I tap, select, or drag within the input
    Then native selection and caret behavior should remain unchanged
```
