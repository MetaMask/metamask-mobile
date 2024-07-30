@androidApp
@upgrade
@fixturesSkipOnboarding
Feature: Upgrade previous app build with current release while being connected to testnet

  Scenario Outline: User with multiple accounts in imported wallet upgrades from current production build to new version
  After upgrading app, accounts should not disappear

    Given the app displayed the splash animation
    And I have imported my wallet
    And I tap No Thanks on the Enable security check screen
    And I close all the onboarding modals
    And I am on the wallet view
    When I tap on the Identicon
    Then select account component is displayed
    When I tap Create a new account
    Then I am on the new account
    When I tap on the Identicon
    Then select account component is displayed
    When I tap import account
    Then I am taken to the Import Account screen
    When I type <PRIVATEKEY> into the private key input field
    And I tap on the private key import button
    Then The account is imported
    And I dismiss the account list
    When I tap on the Settings tab option
    And I scroll up
    And In settings I tap on "About MetaMask"
    Then version "PRODUCTION_BUILD_STRING" is displayed for app upgrade step
    When I install upgrade the app
    And I relaunch the app
    And the splash animation completes
    And I fill my password in the Login screen
    And I log into my wallet
    And I close the Whats New modal
    And I use the back button on Android
    And I am on the wallet view
    Then I am on the "<AccountName>" account
    And I tap on the Settings tab option
    And I scroll up
    And In settings I tap on "About MetaMask"
    And version "NEW_BUILD_STRING" is displayed for app upgrade step

    Examples:
      | PRIVATEKEY                                                       | AccountName |
      | cbfd798afcfd1fd8ecc48cbecb6dc7e876543395640b758a90e11d986e758ad1 | Account 4   |
