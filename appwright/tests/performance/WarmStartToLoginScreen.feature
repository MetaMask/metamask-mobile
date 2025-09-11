@androidApp
@performance
Feature: Measure Login Screen Warm Start

  # This feature measures the warm start of the app when:
  # The user imports a wallet and the time it takes to get from launching app to login view
  Scenario: Measure warm start launch time after Importing a Wallet
    Given the app displayed the splash animation
    And I have imported my wallet
    And I dismiss the Solana New Feature Sheet
    And I am on the wallet view

    When I background the app for 30 seconds
    And the app is move to the foreground
    And the timer starts running
    Then The Login screen should be visible in "4" seconds
