@androidApp
@smoke
@browser
Feature: Browser Import, Revoke, Remove Account

  Scenario: Import wallet
    Given the app displayed the splash animation
    And I have imported my wallet
    And I tap No Thanks on the Enable security check screen
    And I tap No thanks on the onboarding welcome tutorial

  Scenario: User grants permission to a sushiswap to access one of their accounts
    When I navigate to the browser
    # When I tap on button with text "Wallet"
    And I navigate to "https://app.sushi.com/swap"
    Then the connect modal should be displayed
    And I connect my active wallet to the dapp

  Scenario: A user opens another dapp in a new browser tab
    When I tap on browser control menu icon on the bottom right of the browser view
    And I tap the "New Tab" option on the Option Menu
    Then new browser tab is added
    And I navigate to "https://metamask.github.io/test-dapp/"

  Scenario Outline: From the connect accounts modal, a user import an account via private key
    When I trigger the connect modal
    Then the connect modal should be displayed
    When I tap on button with text "Connect multiple accounts"
    And I tap import account
    And I type <PRIVATEKEY> into the private key input field
    And I tap on the private key import button
    Then The account is imported
    When I tap on Select all button
    And I connect multiple accounts to a dapp
    Then I should be connected to the dapp
    And I set "Account 2" as my primary account
    Examples:
      | PRIVATEKEY                                                       |
      | cbfd798afcfd1fd8ecc48cbecb6dc7e876543395640b758a90e11d986e758ad1 |

  Scenario: Remove imported account
    When I navigate to the wallet
    And I tap on the Identicon
    Then the account list should be visible
    When I long press to remove "Account 2"
    And I dismiss the account list

  Scenario: Removed account is no longer connected to dapp
    When I navigate to the browser
    And I tap on the Network Icon
    Then "Account 2" is not displayed

  Scenario: User switches back to sushiswap and verifies that account 1 is still connected
    When I dismiss the connected accounts modal
    And I tap on the tab button
    And I tap on browser tab with text "app.sushi.com"
    Then I should be connected to the dapp
    And "Account 2" is not displayed
    And "Account 1" is visible
