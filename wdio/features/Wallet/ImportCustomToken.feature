@androidApp
@wallet
Feature: Import Custom Token

  Scenario: Import wallet
    Given the app displayed the splash animation
    And I have imported my wallet
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
    When I tap on the Add button to add Custom Network
    Then "<Network>" should be displayed in network educational modal
    And I should see the added network name "<Network>" in the top navigation bar
    Examples:
      | Network   | rpcUrl                                  | ChainID | Symbol |
      | AVAX Fuji | https://api.avax-test.network/ext/C/rpc | 43113   | AVAX   |

  Scenario Outline: Importing Custom tokens
    When I tap on the navbar network title button
    And I select "<NETWORK>" network option
    Then "<NETWORK>" should be displayed in network educational modal
    When I tap Import Tokens
    And I type <TOKENADDRESS> into token Address field
    Then The Token Symbol is displayed
    When I tap on the Import button
    Then I should see "Imported Token" toast message
    Examples:
      | NETWORK             | TOKENADDRESS                               |
      | Goerli Test Network | 0x326C977E6efc84E512bB9C30f76E30c160eD06FB |

  Scenario Outline: Importing Custom tokens
    When I tap on the navbar network title button
    And I select "<NETWORK>" network option
    When I tap Import Tokens
    And I type <TOKENADDRESS> into token Address field
    Then The Token Symbol is displayed
    When I tap on the Import button
    Then I should see "Imported Token" toast message
    Examples:
      | NETWORK   | TOKENADDRESS                               |
      | AVAX Fuji | 0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846 |
