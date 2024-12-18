@androidApp
@performance
Feature: Measure Wallet Screen Cold Start
  # This feature measures the cold start of the app when:
  # The time it takes to get from login view to wallet view.

  Scenario: Cold Start after importing a wallet
    Given I have imported my wallet
    And I tap No Thanks on the Enable security check screen
    And I close all the onboarding modals
    And I am on the wallet screen
    When I kill the app
    And I relaunch the app
    And I fill my password in the Login screen
    And The timer starts running after I tap the login button
    Then The wallet view appears in "4" seconds
