@androidApp
@performance
Feature: Measure the app launch times for warm starts

  Scenario: Measure warm start launch time after importing a wallet
    Given the app displayed the splash animation
    And the splash animation disappears
    And I have imported my wallet
    And I tap No Thanks on the Enable security check screen
    And I tap No thanks on the onboarding welcome tutorial
    And I close the Whats New modal
    And I am on the wallet view
    When I navigate to the browser
    And I navigate to "https://metamask.github.io/test-dapp/"
    Then I connect my active wallet to the test dapp
    When I background the app for 30 seconds
    And the app is move to the foreground
    Then the timer starts running
    And I fill my password in the Login screen
    And I log into my wallet
    And the app should launch within "12" seconds
