@androidApp
@iosApp
@performance
Feature: App Cold Start Launch Times with an imported wallet
  # This feature measures the cold start of the app when:
  # The user imports a wallet and the time it takes to get from launching app to login view
  # The time it takes to get from login view to wallet view.


  Scenario: Measure cold start launch time after importing a wallet
    Given the splash animation disappears
    And I have imported my wallet
    And I tap No Thanks on the Enable security check screen
    And I close all the onboarding modals
    And I am on the wallet screen
    When I kill the app
    And I relaunch the app
    And the timer starts running
    Then The Login screen should be visible in "4" seconds
    And I fill my password in the Login screen
    And The timer starts running after I tap the login button
    Then The wallet view appears in "8" seconds
    And The total times are displayed
