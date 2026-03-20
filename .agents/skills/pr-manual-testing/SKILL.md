---
name: pr-manual-testing
description: Generate Gherkin-format manual testing steps from code changes for pull request descriptions. Use when the user asks for manual testing steps, Gherkin test scenarios, or QA steps for a PR.
---

# PR Manual Testing

## Format

Write scenarios inside a fenced code block with `gherkin` language tag.

**Keywords**: `Feature`, `Background`, `Scenario`, `Given`, `When`, `Then`, `And`

- `Feature` -- name of the feature being tested
- `Background` -- shared preconditions across all scenarios (optional, use when multiple scenarios share setup)
- `Scenario` -- one distinct user flow to verify
- `Given` -- initial state / preconditions
- `When` -- user action
- `Then` -- expected outcome
- `And` -- continuation of the previous keyword

Use **data tables** (`| col | col |`) when verifying multiple inputs or list entries.

## Steps

1. Read the diff: `git diff main...HEAD`
2. Identify the changed features and user-facing behaviors
3. Write scenarios covering the primary happy path and critical edge cases
4. Use multiple `Scenario` blocks when changes affect distinct behaviors

## Template

```gherkin
Feature: [feature name derived from changes]

  Background:
    Given I am logged into MetaMask Mobile

  Scenario: [describe the user flow being verified]
    Given [initial app state]

    When user [performs action]
    Then [expected outcome]
```

## Examples

**Simple single scenario:**

```gherkin
Feature: Token balance refresh

  Scenario: user pulls to refresh token balances
    Given I am on the Wallet home screen
    And I have tokens in my portfolio

    When user pulls down on the token list
    Then the token balances should update
    And a loading indicator should appear briefly
```

**Multiple scenarios with background:**

```gherkin
Feature: Network selector migration to design system

  Background:
    Given I am logged into MetaMask Mobile
    And I have multiple networks configured

  Scenario: user switches network from wallet screen
    Given I am on the Wallet home screen

    When user taps the network selector
    Then I should see the network list bottom sheet
    And the current network should be highlighted

    When user selects "Linea"
    Then the network should switch to "Linea"
    And the wallet should display Linea balances

  Scenario: user dismisses network selector
    Given I am on the Wallet home screen

    When user taps the network selector
    And user taps outside the bottom sheet
    Then the network selector should close
    And the network should remain unchanged
```

**Scenario with data table:**

```gherkin
Feature: Address book validation

  Scenario: user enters invalid addresses
    Given I am on the Send screen

    When user enters the following invalid addresses:
      | Input               | Reason          |
      | 0x123               | Too short       |
      | not-an-address      | Invalid format  |
    Then the "Next" button should remain disabled
```

## Reference

For richer Gherkin patterns (tags, complex data tables, network-specific scenarios), see `app/features/SampleFeature/e2e/sample-scenarios.feature`.
