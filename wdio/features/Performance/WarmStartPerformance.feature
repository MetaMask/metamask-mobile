@androidApp
@performance
Feature: App Warm Start Launch Times with an imported wallet
  # This feature measures the warm start of the app when:
  # The user imports a wallet and the time it takes to get from launching app to login view
  # The time it takes to get from login view to wallet view.

  Scenario: Measure warm start launch time after importing a wallet
    Given the app displayed the splash animation
    And I have imported my wallet
    And I tap No Thanks on the Enable security check screen
    And I close all the onboarding modals
    And I am on the wallet view
    When I navigate to the browser
    And I navigate to "https://metamask.github.io/test-dapp/"
    Then I connect my active wallet to the test dapp
    When I background the app for 30 seconds
    And the app is move to the foreground
    And the timer starts running
    Then The Login screen should be visible in "4" seconds
    And I fill my password in the Login screen
    And The timer starts running after I tap the login button
    Then The wallet view appears in "6" seconds
    And The total times are displayed

