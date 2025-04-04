@androidApp
@regression
@accounts
Feature: Displaying account actions

  Scenario: Show private key screen
    Given the app displayed the splash animation
    And I have imported my wallet
    And I tap No Thanks on the Enable security check screen
    And I tap No thanks on the onboarding welcome tutorial
    And I open the account actions
    And I press show private key
    Then The Reveal Private key screen should be displayed
    When I enter my password on the Reveal Private Credential screen
    Then my Private Key is displayed

  Scenario: View address on Etherscan
    Given I am on the main wallet view
    And I open the account actions
    And I press view on etherscan

  Scenario: Press share address
    Given I am on the main wallet view
    And I open the account actions
    And I press share address
