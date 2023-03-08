@androidApp @ChainScenarios
Feature: App launch times
  As a user,
  I want to measure the time it takes to launch the app,
  So that I can ensure it is performing well

  Scenario: Measure app launch time on fresh install
    Given the app is launched
    When the app displayed the splash animation
    Then the app should launch within x seconds

  Scenario: Measure app launch time after importing a wallet
    Given the splash animation disappears
    And I agree to terms
    And Terms of Use is not displayed
    And I have imported my wallet
    And I tap No Thanks on the Enable security check screen
    And I tap No thanks on the onboarding welcome tutorial
    And I am on the wallet view
    When I kill the app
    And I relaunch the app
    And the timer starts running
    And the app displayed the splash animation
    And the splash animation disappears
    And I fill my password in the Login screen
    And I log into my wallet
    Then the app should launch within x seconds
