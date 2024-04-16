@androidApp
@upgrade
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
    Then version "PRODUCTION_BUILD_STRING" is displayed for app upgrade step
    When I install upgrade the app
    And I relaunch the app
    And the splash animation completes
    And I fill my password in the Login screen
    And I log into my wallet
    And I tap on the Settings tab option
    And In settings I tap on "About MetaMask"
    Then version "NEW_BUILD_STRING" is displayed for app upgrade step
    And removed test app
