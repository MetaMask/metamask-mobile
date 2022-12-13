@androidApp
Feature: Address
  You can saved an ENS name to your address book
  The contacts you saved on network A does not carry over to network B

  Scenario: A user enters an invalid address
    Given I import wallet using seed phrase "fold media south add since false relax immense pause cloth just raven"
    And I tap No Thanks on the Enable security check screen
    And I tap No thanks on the onboarding welcome tutorial
    When On the Main Wallet view I tap "Send" navigating to the send screen
    And I enter invalid address "<Address>" into senders input field
    Then I should see a warning message "Recipient address is invalid."
    Examples:
      | Address                                    |
      | 0xB8B4EE5B1b693971eB60bDa15211570df2dB221L |

  Scenario: A user attempts to send to a contract address in the send flow
    And I enter a contract address "<Address>" in the sender's input box
    Then I should see a warning message "<WarningMessage>"
    When I tap on button with text "I understand the risks, continue"
    Then I proceed to the amount view
    Examples:
      | Address                                    | WarningMessage                                                                                    |
      | 0xdac17f958d2ee523a2206206994597c13d831ec7 | This address is a token contract address. If you send tokens to this address, you will lose them. |

  Scenario: A user adds an address to their contacts from the send flow and confirms it is visible on the contacts view
    Given I am on the wallet view
    And On the Main Wallet view I tap "Send"
    When I enter a contract address "<Address>" in the sender's input box
    And I tap on button with text "Add this address to your address book"
    Then On the Address book modal Cancel button is enabled
    When I enter in a contact name "<ContactName>"
    Then the Save button becomes enabled
    When I tap the Save button
    And the contact name "<ContactName>" appears in the senders input box above the contact address
    And I navigate to the main wallet screen
    And I tap on the burger menu
    And I tap on "Settings" in the menu
    And In settings I tap on "Contacts"
    Then the saved contact "<ContactName>" should appear
    Examples:
      | Address                                    | ContactName |
      | 0x1FDb169Ef12954F20A15852980e1F0C122BfC1D6 | TestAlias   |


  Scenario: A user can add a contact on the contacts view
    Given I am on the contacts view
    And I tap on button with text "Add contact"
    When I input "<ContactName>" into the contact name field
    And I input "<AddressName>" in the Address field
    And I tap button "Add contact" which is now enabled
    Then the saved contact "<ContactName>" should appear
    Examples:
      | ContactName | AddressName |
      | Birdis      | mike.eth      |

  Scenario: A user has a saved address and edits that saved address
    Given I have a saved contact "<FirstContactName>" on the contacts view
    When I tap on contact name "<FirstContactName>"
    And I tap on Edit button to edit Saved contact details
    Then I can edit the contact name to "<EditContactName>"
    When I tap the Edit Contact button which is enabled to confirm the change
    Then the saved contact "<EditContactName>" should appear
    When I go back to the main wallet screen
    And On the Main Wallet view I tap "Send" navigating to the send screen
    Then I should see the edited name "<EditContactName>" contact under Recents on the send screen
    Examples:
      | FirstContactName | EditContactName |
      | Birdis           | James           |

  Scenario: A user has a saved address then deletes it
    Given I navigate to the main wallet view from Send screen
    And I tap on the burger menu
    And I tap on "Settings" in the menu
    And In settings I tap on "Contacts"
    And I tap on button with text "Add contact"
    When I input "<ContactName>" into the contact name field
    And I input "<EthAddress>" in the Address field
    And I tap button "Add contact" which is now enabled
    Then the saved contact "<ContactName>" should appear
    When I tap on contact name "<ContactName>"
    And I tap on Edit button to edit Saved contact details
    And I tap on button with text "Delete"
    And I tap on button with text "Delete"
    Then the deleted contact "<ContactName>" should not appear
    When I go back to the main wallet screen
    And On the Main Wallet view I tap "Send" navigating to the send screen
    Then the deleted contact "<ContactName>" should not appear
    Examples:
      | ContactName | EthAddress |
      | jande       | curt.eth   |

  Scenario: A user saves an address on mainnet and should not see that saved address on Goreli
    Given I navigate to the main wallet view from Send screen
    And I tap on the burger menu
    And I tap on "Settings" in the menu
    And In settings I tap on "Contacts"

    And I tap on button with text "Add contact"
    When I input "<ContactName>" into the contact name field
    And I input "guto.eth" in the Address field
    And I tap button "Add contact" which is now enabled
    Then the saved contact "<ContactName>" should appear
    When I go back to the main wallet screen
    And On the Main Wallet view I tap "Send" navigating to the send screen
    Then I should see the edited name "<ContactName>" contact under Recents on the send screen
    When I navigate back to main wallet screen
    And I tap on the navbar network title button
    And I tap on button with text "Goerli Test Network"
    And I tap on button with text "Got it"
    Then I should see the added network name "Goerli Test Network" in the top navigation bar
    And I tap on the burger menu
    And I tap on "Settings" in the menu
    And In settings I tap on "Contacts"
    Then I should not see "<ContactName>" appear in the contact list
    Examples:
      | ContactName |
      | Gusto       |