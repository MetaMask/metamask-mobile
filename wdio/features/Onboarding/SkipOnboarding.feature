@androidApp
@smoke
@onboarding
Feature: Skip onboarding test fixture

  Scenario: Skip onboarding and unlock wallet 
    User opens the app and unlock wallet
    Given Fixture server is started
    Then Load fixtures into state to skip onboarding steps
    When the app displayed the splash animation
    And the splash animation disappears
    And I unlock wallet with <password>
    Then Wallet view is displayed
    And "Account 1" is visible
    Then Fixture server is stopped
    Examples:
      | password   |
      | 123123123 |
