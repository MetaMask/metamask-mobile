@androidApp
@ChainScenarios
@regression
Feature: Sending Native and ERC Tokens

Feature tests the sending of Native and ERC Tokens

  Scenario: Import wallet to setup
    Given the app displayed the splash animation
    And I have imported my wallet
    When I tap No Thanks on the Enable security check screen
    And I tap No thanks on the onboarding welcome tutorial
    And I close the Whats New modal
    Then I am on the wallet view

  Scenario Outline: Adding AVAX testnet to my networks list
    Given I tap on the navbar network title button
    And I tap on the Add a Network button
    And I tap on the "CUSTOM NETWORKS" tab
    And I type "<Network>" into Network name field
    And I type "<rpcUrl>" into the RPC url field
    And I type "<ChainID>" into the Chain ID field
    And I type "<Symbol>" into the Network symbol field
    When I tap on the Add button
    And I tap on Got it in the network education modal
    Then I see "<Network>" visible in the top navigation bar

    Examples:
      | Network   | rpcUrl                                  | ChainID | Symbol |
      | AVAX Fuji | https://api.avax-test.network/ext/C/rpc | 43113   | AVAX   |

  Scenario Outline: Import Custom Goerli Token
    Given I tap on the navbar network title button
    And I tap on <NETWORK> on Networks list to switch
    And I tap on Got it in the network education modal

    When I tap Import Tokens
    And I type <TOKENADDRESS> into token Address field
    Then The Token Symbol is displayed

    When I tap on the Import button
    Then I should see "Imported Token" toast message

    Examples:
      | NETWORK             | TOKENADDRESS                               |
      | Goerli Test Network | 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984 |

  Scenario Outline: Import Custom AVAX Fuji Token
    Given I tap on the navbar network title button
    And I tap on <NETWORK> on Networks list to switch

    When I tap Import Tokens
    And I type <TOKENADDRESS> into token Address field
    Then The Token Symbol is displayed

    When I tap on the Import button
    Then I should see "Imported Token" toast message

    Examples:
      | NETWORK   | TOKENADDRESS                               |
      | AVAX Fuji | 0x5425890298aed601595a70AB815c96711a31Bc65 |

  Scenario Outline: A user can send native tokens to an Address via the wallet view send button
    Given I see "<NETWORK>" visible in the top navigation bar
    And On the Main Wallet view I tap on the Send Action
    And I enter address "<Address>" in the sender's input box
    When I tap button "Next" on Send To view
    Then I proceed to the amount view

    When I type amount "<AMOUNT>" into amount input field
    And I tap button "Next" on the Amount view
    Then I should be taken to the transaction confirmation view
    And the token <TOKEN> being sent is visible
    And the token amount <AMOUNT> to be sent is visible

    When I tap button "Send" on Confirm Amount view
    Then Sending token takes me to main wallet view
    And the transaction is submitted with Transaction Complete! toast appearing

    Examples:
      | NETWORK   | TOKEN | AMOUNT | Address                                    |
      | AVAX Fuji | AVAX  | 0.005  | 0xA7E129A38860432492708568465AE1A5ca50b373 |

  Scenario Outline: A user can send ERC-20 tokens to an Address via token overview screen
    Given I am on the wallet view
    And I see "<NETWORK>" visible in the top navigation bar
    When I tap Token containing text "<TOKEN>"
    Then I am taken to the token overview screen

    When I tap button Send on Token screen view
    And I enter address "<Address>" in the sender's input box
    And I tap button "Next" on Send To view
    And I type amount "<AMOUNT>" into amount input field
    And I tap button "Next" on the Amount view
    Then I should be taken to the transaction confirmation view
    And the token <TOKEN> being sent is visible
    And the token amount <AMOUNT> to be sent is visible

    When I tap button "Send" on Confirm Amount view
    Then I am taken to the token overview screen
    And the transaction is submitted with Transaction Complete! toast appearing


    Examples:
      | NETWORK   | TOKEN | AMOUNT | Address                                    |
      | AVAX Fuji | USDC  | 0.002  | 0xebe6CcB6B55e1d094d9c58980Bc10Fed69932cAb |


  Scenario Outline: A user tries to send an invalid amount
    Given I tap back from the Token overview page
    And I am on the wallet view
    And On the Main Wallet view I tap on the Send Action
    And I enter address "<Address>" in the sender's input box

    When I tap button "Next" on Send To view
    And I type amount "<AMOUNT>" into amount input field
    And I tap button "Next" on the Amount view
    Then "Insufficient funds" is visible

    Examples:
      | NETWORK   | TOKEN  | AMOUNT                | Address                                    |
      | AVAX Fuji | 1 USDC | 121212121212121212121 | 0xebe6CcB6B55e1d094d9c58980Bc10Fed69932cAb |
