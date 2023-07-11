@androidApp
@regression
@wallet
Feature: Add Contacts
  User should see the correct warning when trying to send funds to a contract address
  User can saved an ENS name to your address book
  The contacts you saved on network A does not carry over to network B

  Scenario: Import account and navigate to Send
    Given the app displayed the splash animation
    And I have imported my wallet
    And I tap No Thanks on the Enable security check screen
    And I tap No thanks on the onboarding welcome tutorial
    And On the Main Wallet view I tap on the Send Action

  Scenario Outline: Validate invalid and valid wallet address <Case>
    When I enter address "<contractAddress>" in the sender's input box
    Then I should see a warning message "<Warning>"
    Examples:
      | Case            | contractAddress                            | Warning                                                                                           |
      | Invalid address | 0xB8B4EE5B1b693971eB60bDa15211570df2dB221L | Recipient address is invalid.                                                                     |
      | Valid address   | 0xdac17f958d2ee523a2206206994597c13d831ec7 | This address is a token contract address. If you send tokens to this address, you will lose them. |

  Scenario: Confirm contract address warning
    When I tap on button with text "I understand the risks, continue"
    Then I proceed to the amount view
    And I tap on button with text "Cancel"

  Scenario Outline: A user adds an address to their contacts from the send flow and confirms it is visible on the contacts view
    When On the Main Wallet view I tap on the Send Action
    When I enter address "<Address>" in the sender's input box
    And I tap on button with text "Add this address to your address book"
    Then On the Address book modal Cancel button is enabled
    When I enter in a contact name "<ContactName>"
    Then the Save button becomes enabled
    When I tap the Save button
    And the contact name "<ContactName>" appears in the senders input box above the contact address
    And I navigate to the main wallet screen
    And I tap on the Settings tab option
    And In settings I tap on "Contacts"
    Then the saved contact "<ContactName>" should appear
    Examples:
      | Address                                    | ContactName |
      | 0x1FDb169Ef12954F20A15852980e1F0C122BfC1D6 | TestAlias   |

  Scenario Outline: A user has a saved address then deletes it
    When I tap on contact name "<ContactName>"
    And I tap on Edit button to edit Saved contact details
    And I tap button Delete to navigate to Contacts view
    Then the deleted contact "<ContactName>" should not appear
    Examples:
      | ContactName |
      | TestAlias   |

  Scenario Outline: A user can add a contact on the contacts view and edit the saved contact
    Given I am on the contacts view
    And I tap on the Add contact button on the Contact view
    And I input "<ContactName>" into the contact name field
    And I input "<AddressName>" in the Address field
    And I tap button Add contact which is now enabled
    Then the saved contact "<ContactName>" should appear
    When I tap on contact name "<ContactName>"
    And I tap on Edit button to edit Saved contact details
    Then I can edit the contact name to "<EditContactName>"
    When I tap the Edit Contact button which is enabled to confirm the change
    Then the saved contact "<EditContactName>" should appear
    When I go back to the main wallet screen
    And On the Main Wallet view I tap on the Send Action
    Then I should see the edited name "<EditContactName>" contact under Recents on the send screen
    And I should not see the edited name "<DeletedContactName>" contact under Recents on the send screen
    Examples:
      | ContactName | AddressName | EditContactName | DeletedContactName |
      | Birdis      | mike.eth    | James           | TestAlias          |

  Scenario Outline: A user saves an address on mainnet and should not see that saved address on Goreli
    Given I navigate to the main wallet view from Send screen
    And I tap on the navbar network title button
    And I tap on button with text "Goerli Test Network"
    And I tap on button with text "Got it"
    Then I should see the added network name "Goerli Test Network" in the top navigation bar
    And I tap on the Settings tab option
    And In settings I tap on "Contacts"
    Then I should not see "<ContactName>" appear in the contact list
    Examples:
      | ContactName |
      | Birdis      |
