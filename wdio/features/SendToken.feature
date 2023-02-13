@androidApp
@ChainScenarios
@regression
Feature: Sending Native and ERC Tokens

    Feature tests the sending of Native and ERC Tokens

    Scenario: Import wallet to setup
        Given I have imported my wallet
        And I tap No Thanks on the Enable security check screen
        And I tap No thanks on the onboarding welcome tutorial


    Scenario Outline: Adding AVAX testnet to my networks list
        When I tap on the navbar network title button
        And I tap on the Add a Network button

        When I tap on the "CUSTOM NETWORKS" tab

        When I type "<Network>" into Network name field
        And I type "<rpcUrl>" into the RPC url field
        And I type "<ChainID>" into the Chain ID field
        And I type "<Symbol>" into the Network symbol field

        When I tap on the Add button
        And I tap on Got it in the network education modal
        Then I should see the added network name "<Network>" in the top navigation bar

        Examples:
            | Network   | rpcUrl                                  | ChainID | Symbol |
            | AVAX Fuji | https://api.avax-test.network/ext/C/rpc | 43113   | AVAX   |

    Scenario Outline: Importing Custom tokens
        When I tap on the navbar network title button
        And I tap on <NETWORK> on Networks list to switch
        And I tap on Got it in the network education modal

        When I tap Import Tokens
        And I type <TOKENADDRESS> into token Address field
        Then The Token Symbol is displayed

        When I tap on the Import button
        Then I should see "Imported Token" toast message

        Examples:
            | NETWORK             | TOKENADDRESS                               |
            | Goerli Test Network | 0x326C977E6efc84E512bB9C30f76E30c160eD06FB |
            | AVAX Fuji           | 0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846 |


    Scenario Outline: A user can send native tokens to an Address via the wallet view send button
        Given I see "<NETWORK>" visible in the top navigation bar
        And On the Main Wallet view I tap "Send"
        When I tap on the "Send"
        And I enter address <Address> in the sender's input box
        And I tap on the "Next" button
        Then I am taken to the Amount view
        When I select <TOKEN>
        And I enter <AMOUNT>
        And I tap on the "Next" button
        Then I should be taken to the transaction confirmation view
        And the  <TOKEN> being sent is visible
        And the  <AMOUNT> of tokens being sent is visible
        And the fiat value conversion of the tokens being sent is below
        And the Estimated gas fee field is populated with a suggested gas price
        When I tap on the "Send" button
        Then the transaction is submitted
        And I am taken to the wallet view
        And a toast notification appears letting me know the transaction status

        Examples:
            | NETWORK           | TOKEN | AMOUNT | Address                                    |
            | Goerli            | ETH   | 0.0004 | 0xebe6CcB6B55e1d094d9c58980Bc10Fed69932cAb |
            | Fuji Avax Testnet | Avax  | 0.005  | 0xA7E129A38860432492708568465AE1A5ca50b373 |

    Scenario Outline: A user can send ERC-20 tokens to an Address via token overview screen
        Given I am on the wallet view
        And my network is set to <NETWORK>
        When I tap on the <TOKEN> on the wallet view
        Then I am taken to the token overview screen
        When I tap on the "Send"
        And I enter address <Address> in the sender's input box
        And I enter <AMOUNT>
        And I tap on the "Next" button
        Then I should be taken to the transaction confirmation view
        And the  <TOKEN> being sent is visible
        And the  <AMOUNT> of tokens being sent is visible
        And the fiat value conversion of the tokens being sent is below
        And the Estimated gas fee field is populated with a suggested gas price
        When I tap on the "Send" button
        Then the transaction is submitted
        And I am taken to the wallet view
        And a toast notification appears letting me know the transaction status

        Examples:
            | NETWORK           | TOKEN | AMOUNT | Address                                    |
            | Goerli            | LINK  | 0.003  | 0xA7E129A38860432492708568465AE1A5ca50b373 |
            | Fuji Avax Testnet | LINK  | 0.002  | 0xebe6CcB6B55e1d094d9c58980Bc10Fed69932cAb |


    Scenario Outline: A user tries to send an invalid amount
        When On the Main Wallet view I tap "Send"
        When I input an invalid <TOKEN> amount
        And I tap on the "Next" button
        Then I should see an error message "Insufficient funds"