@temp @androidApp @performance
# @performance

Feature: Measure Wallet Screen Cold Start
  # This feature measures the cold start of the app when:
  # The time it takes to get from login view to wallet view.

  Background:
    Given I start the fixture server with login state
     When I fill my password in the Login screen
    And The timer starts running after I tap the login button

  Scenario: Cold Start after importing a wallet
    Given I am on the wallet screen
    And I tap on the Identicon
    Then I am on the "Account 1" account
    When I start the fixture server with login state
