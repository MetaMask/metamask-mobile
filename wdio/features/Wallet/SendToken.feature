@androidApp
@regression
@wallet
Feature: Sending Native and ERC Tokens

  Scenario: Import wallet
    Given the app displayed the splash animation
    And I have imported my wallet
    And I tap No Thanks on the Enable security check screen
    And I tap No thanks on the onboarding welcome tutorial
    Then I am on the wallet view

  Scenario Outline: Import ChainLink Token
    Given I tap on the navbar network title button
    When I select "<NETWORK>" network option
    And "<NETWORK>" should be displayed in network educational modal
    Then I see "<NETWORK>" visible in the top navigation bar
    When I tap Import Tokens
    And I type <TOKEN_ADDRESS> into token Address field
    Then The Token Symbol is displayed
    When I tap on the Import button
    Then I should see "Imported Token" toast message
    Examples:
      | NETWORK              | TOKEN_ADDRESS                              |
      | Sepolia Test Network | 0x779877A7B0D9E8603169DdbD7836e478b4624789 |

  Scenario Outline: A user can send ERC-20 tokens to an Address via token overview screen
    Given I am on the wallet view
    When I tap on button with text "<TOKEN_NAME>"
    Then I am taken to the token overview screen
    When I tap button Send on Token screen view
    And I enter address "<Address>" in the sender's input box
    And I tap button "Next" on Send To view
    And I type amount "<AMOUNT>" into amount input field
    And I tap button "Next" on the Amount view
    Then I should be taken to the transaction confirmation view
    And the token <TOKEN_SYMBOL> being sent is visible
    And the token amount <AMOUNT> to be sent is visible
    When I tap button Send on Confirm Amount view
    Then the transaction is submitted toast should appeared
    And the transaction is submitted with Transaction Complete! toast appearing
    And I am taken to the token overview screen
    And I tap back from the Token overview page
    Examples:
      | TOKEN_NAME      | TOKEN_SYMBOL | AMOUNT | Address                                    |
      | ChainLink Token | LINK         | 0.002  | 0x2990079bcdEe240329a520d2444386FC119da21a |

  Scenario Outline: A user can send native tokens to an Address via the wallet view send button
    And On the Main Wallet view I tap on the Send Action
    And I enter address "<Address>" in the sender's input box
    When I tap button "Next" on Send To view
    Then I proceed to the amount view
    When I type amount "<AMOUNT>" into amount input field
    And I tap button "Next" on the Amount view
    Then I should be taken to the transaction confirmation view
    And the token <TOKEN> being sent is visible
    And the token amount <AMOUNT> to be sent is visible
    When I tap button Send on Confirm Amount view
    And Sending token takes me to main wallet view
    Examples:
      | TOKEN      | AMOUNT | Address                                    |
      | SepoliaETH | 0.002  | 0x2990079bcdEe240329a520d2444386FC119da21a |

  Scenario Outline: A user tries to send an invalid amount
    When I am on the wallet view
    And On the Main Wallet view I tap on the Send Action
    And I enter address "<Address>" in the sender's input box
    When I tap button "Next" on Send To view
    And I type amount "<AMOUNT>" into amount input field
    And I tap button "Next" on the Amount view
    Then Insufficient funds error message should be visible
    Examples:
      | AMOUNT | Address                                    |
      | 25     | 0x2990079bcdEe240329a520d2444386FC119da21a |
