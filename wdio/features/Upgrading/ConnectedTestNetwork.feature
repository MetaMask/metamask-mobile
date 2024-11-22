@androidApp
@upgrade
@fixturesSkipOnboarding
Feature: Upgrade previous app build with current release

  Scenario Outline: User upgrades from current production build to new version
  User should add a custom network
  Have tokens imported before update

    Given the app displayed the splash animation
    And I have imported my wallet
    And I tap No Thanks on the Enable security check screen
    And I close all the onboarding modals
    And I am on the wallet view
    When I tap on the navbar network title button
    And the Network List Modal is Displayed
    When I tap the Test Network toggle
    And I tap on the "<Network>" button
    Then "<Network>" should be displayed in network educational modal
    And I should see the added network name "<Network>" in the top navigation bar
    And tokens <TOKEN> in account should be displayed
    When I tap on the Settings tab option
    And I scroll up
    And In settings I tap on "About MetaMask"
    Then version "PRODUCTION_BUILD_STRING" is displayed for app upgrade step
    When I install upgrade the app
    And I relaunch the app
    And I fill my password in the Login screen
    And I log into my wallet
    Then I should see the added network name "Sepolia" in the top navigation bar
    And tokens <TOKEN> in account should be displayed
    And I tap on the Settings tab option
    And I scroll up
    And In settings I tap on "About MetaMask"
    Then version "NEW_BUILD_STRING" is displayed for app upgrade step
    And removed test app

    Examples:
      | Network | TOKEN      |
      | Sepolia | SepoliaETH |
