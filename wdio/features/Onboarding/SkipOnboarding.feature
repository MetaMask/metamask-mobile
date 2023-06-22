@androidApp
@smoke
@onboarding
Feature: Skip onboarding test fixture

  Scenario: Skip onboarding and unlock wallet 
    User opens the app and unlock wallet
    Given State is loaded with fixtures to skip onboarding steps
    When the app displayed the splash animation
    And the splash animation disappears
    And I unlock wallet with <password>
    Then Wallet view is displayed
    And "Account 1" is visible
    Examples:
      | password   |
      | 123123123 |
