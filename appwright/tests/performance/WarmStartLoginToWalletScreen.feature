@androidApp
@performance
Feature: Measure Wallet Screen Warm Start

  # This feature measures the warm start of the app when:
  # The time it takes to get from login view to wallet view.
  Scenario: Measure Warm Start after Importing a Wallet
    Given the app displayed the splash animation
    And I have imported my wallet
    And I dismiss the Solana New Feature Sheet
    And I am on the wallet view

    When I navigate to the browser
    And I navigate to "https://metamask.github.io/test-dapp/"
    Then I connect my active wallet to the test dapp

    When I background the app for 30 seconds
    And the app is move to the foreground
    And I fill my password in the Login screen
    And The timer starts running after I tap the login button
    Then The wallet view appears in "4" seconds
