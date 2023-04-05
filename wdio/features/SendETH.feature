@androidApp
@ChainScenarios
@regression

Feature: Adding Networks via the popular and custom networks flow
  A user should be able to add a custom network via the popular network flow
  A user should also have the ability to a add custom network via the custom network flow.

  Scenario Outline: Adding a network via the custom network flow
    Given I have imported my wallet
    And I tap No Thanks on the Enable security check screen
    And I tap No thanks on the onboarding welcome tutorial
    Given I tap on the burger menu
    And I tap on "Settings" in the menu
    And In settings I tap on "Networks"
    And I tap on the Add Network button
    Then "POPULAR" tab is displayed on networks screen
    And "CUSTOM NETWORKS" tab is displayed on networks screen

    When I tap on the "CUSTOM NETWORKS" tab

    When I type "<Network>" into Network name field
    And I type "<rpcUrl>" into the RPC url field
    And I type "<ChainID>" into the Chain ID field
    And I type "<Symbol>" into the Network symbol field

    When I tap on the Add button
    And I tap on Got it in the network education modal
    Then I should see the added network name "<Network>" in the top navigation bar

    Examples:
      | Network        | rpcUrl                 | ChainID | Symbol |
      | Localhost 8545 | http://localhost:8545 | 1337    | ETH    |

  Scenario Outline: A user adds an address to their contacts from the send flow and confirms it is visible on the contacts view
    When On the Main Wallet view I tap "Send"

    When I enter address "<Address>" in the sender's input box
    And I tap on button with text "Add this address to your address book"
    Then On the Address book modal Cancel button is enabled

    When I enter in a contact name "<ContactName>"
    Then the Save button becomes enabled

    When I tap the Save button
    And the contact name "<ContactName>" appears in the senders input box above the contact address
    And I navigate to the main wallet screen
    And I tap burger icon
    And I tap on "Settings" in the menu
    And In settings I tap on "Contacts"
    Then the saved contact "<ContactName>" should appear

    Examples:
      | Address                                    | ContactName |
      | 0x1FDb169Ef12954F20A15852980e1F0C122BfC1D6 | TestAlias   |