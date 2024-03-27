@androidApp
@performance
@fixturesSkipOnboarding
Feature: Measure the app launch times for warm starts

  Scenario: Measure warm start launch time after importing a wallet
    Given the app displayed the splash animation
    And I have imported my wallet
    And I tap No Thanks on the Enable security check screen
    And I tap No thanks on the onboarding welcome tutorial
    And I close the Whats New modal
    And I am on the wallet view
    When I tap on the Settings tab option
    And I scroll up
    And In settings I tap on "About MetaMask"
    Then "MetaMask-QA v7.16.0 (1265)" is displayed
    When I install upgrade the app
    And I relaunch the app
    And the app displayed the splash animation
    And I fill my password in the Login screen
    And I log into my wallet
    And I tap on the Settings tab option
    And I scroll up
    And In settings I tap on "About MetaMask"
    Then "MetaMask-QA v7.17.0 (1267)" is displayed
    And removed test app
