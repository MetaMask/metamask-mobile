@androidApp
@ChainScenarios
@smoke

Feature: Importing account in wallet

  Scenario: Import account
    Given I have imported my wallet
    And I tap No Thanks on the Enable security check screen
    And I tap No thanks on the onboarding welcome tutorial

  Scenario Outline: Import an account using an invalid private key
    Given I am on the wallet view

    When I tap on the Identicon
    Then the account list should be visible

    When I tap on Import an account
    Then I am taken to the Import Account screen
    And I type <PRIVATEKEY> into the private key input field
    And I tap on the private key import button
    Then I should see an error <warning>
    And I close the import account screen

    When I tap on the Identicon
    Then the account list should not be visible

    Examples:
      | PRIVATEKEY | warning                              |
      | 23423411x  | We couldn't import that private key. |

  Scenario Outline: Import an account using a valid private key
    Given I am on the wallet view

    When I tap on the Identicon
    Then the account list should be visible

    When I tap on Import an account
    Then I am taken to the Import Account screen

    When I type <PRIVATEKEY> into the private key input field
    And I tap on the private key import button
    Then The account is imported

    When I dismiss the account list
    Then I am on the imported account

    Examples:
      | PRIVATEKEY                                                       |
      | cbfd798afcfd1fd8ecc48cbecb6dc7e876543395640b758a90e11d986e758ad1 |
