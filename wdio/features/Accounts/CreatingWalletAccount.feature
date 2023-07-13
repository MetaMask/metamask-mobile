@androidApp
@smoke
@accounts
Feature: Create Account

  Scenario: Import wallet
    Given the app displayed the splash animation
    And I have imported my wallet
    And I tap No Thanks on the Enable security check screen
    And I tap No thanks on the onboarding welcome tutorial

  Scenario: Creating a new wallet account
    Given I am on the wallet view
    When I tap on the Identicon
    Then the account list should be visible
    When I tap Create a new account
    Then I am on the new account
