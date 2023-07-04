@androidApp
@smoke
@onboarding
@fixturesSkipOnboarding
Feature: Skip onboarding test fixture

  Scenario: Skip onboarding and unlock wallet 
    User opens the app and unlock wallet
    Given the app displayed the splash animation
    And the splash animation disappears
    And I unlock wallet with <password>
    Then Wallet view is displayed
    Examples:
      | password   |
      | 123123123 |
