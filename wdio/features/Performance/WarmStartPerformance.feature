@smoke
@androidApp
@performance
Feature: Measure the app launch times for warm starts

  Scenario: Measure cold start launch time after importing a wallet
    Given the app displayed the splash animation
    And I have imported my wallet
    And I tap No Thanks on the Enable security check screen
    And I tap No thanks on the onboarding welcome tutorial
    And I am on the wallet view
    When I navigate to the browser
    And I navigate to "https://app.sushi.com/swap"
    Then the connect modal should be displayed
    And I connect my active wallet to the dapp
    When I background the app for 30 seconds
    Then the timer starts running
    And I fill my password in the Login screen
    And I log into my wallet
    And the app should launch within "15000" seconds
