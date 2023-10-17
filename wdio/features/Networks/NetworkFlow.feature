@androidApp
@regression
@networks
Feature: Add Networks
User should be able to add a custom network via the popular network flow
User should also have the ability to a add custom network via the custom network flow.

  Scenario Outline: Adding a network via the new popular network flow
    Given the app displayed the splash animation
    And I have imported my wallet
    And I tap No Thanks on the Enable security check screen
    And I tap No thanks on the onboarding welcome tutorial
    When I tap on the navbar network title button
    And I tap on the Add a Network button
    Then "POPULAR" tab is displayed on networks screen
    And "CUSTOM NETWORKS" tab is displayed on networks screen
    And I am on the Popular network view
    When I tap on network "<Network>" to add it
    Then the network approval modal should appear
    When I select approve
    Then the network approval modal has button "Switch Network" displayed
    And the network approval modal has button "Close" displayed
    When I tap on Switch network
    Then "<Network>" should be displayed in network educational modal
    And I should see the added network name "<Network>" in the top navigation bar
    When I tap on the Settings tab option
    And In settings I tap on "Networks"
    Then "<Network>" should be visible below the Custom Networks section
    When I tap on the Add Network button
    Then "<Network>" is not visible in the Popular Networks section
    Examples:
      | Network |
      | Palm    |

  Scenario Outline: Adding a network via the custom network flow
    Given the network screen is displayed
    And I tap on the Add Network button
    Then "POPULAR" tab is displayed on networks screen
    And "CUSTOM NETWORKS" tab is displayed on networks screen
    When I tap on the "CUSTOM NETWORKS" tab
    And I type "<Network>" into Network name field
    And I type "<rpcUrl>" into the RPC url field
    And I type "<ChainID>" into the Chain ID field
    And I type "<Network>" into the Network symbol field
    And I tap on the Add button to add Custom Network
    Then "<Network>" should be displayed in network educational modal
    And I should see the added network name "<Network>" in the top navigation bar
    Examples:
      | Network | rpcUrl                                | ChainID | Symbol |
      | Gnosis  | https://xdai-rpc.gateway.pokt.network | 100     | xDAI   |

  Scenario Outline: I can remove a custom network that was added via the popular network flow
    Given I tap on the Settings tab option
    And In settings I tap on "Networks"
    And the network screen is displayed
    And I tap on the Add Network button
    Then "POPULAR" tab is displayed on networks screen
    And "CUSTOM NETWORKS" tab is displayed on networks screen
    When I tap on the "POPULAR" tab
    And I tap on network "<Network>" to add it
    And I select approve
    Then the network approval modal has button "Switch Network" displayed
    And the network approval modal has button "Close" displayed
    When I tap on Switch network
    Then "<Network>" should be displayed in network educational modal
    Then I should see the added network name "<Network>" in the top navigation bar
    When I tap on the Settings tab option
    And In settings I tap on "Networks"
    And I tap and hold network "<Network>"
    And I click "Delete" on remove network modal
    Then "Ethereum Main Network" should be displayed in network educational modal
    And "<Network>" should be removed from the list of RPC networks
    Examples:
      | Network  |
      | Optimism |

  Scenario Outline: I can remove a custom network that was added via the custom network flow
    Given the network screen is displayed
    When I tap on the Add Network button
    Then "POPULAR" tab is displayed on networks screen
    And "CUSTOM NETWORKS" tab is displayed on networks screen
    When I tap on the "CUSTOM NETWORKS" tab
    And I type "<Network>" into Network name field
    And I type "<rpcUrl>" into the RPC url field
    And I type "<ChainID>" into the Chain ID field
    And I type "<Network>" into the Network symbol field
    And I tap on the Add button to add Custom Network
    Then "<Network>" should be displayed in network educational modal
    Then I should see the added network name "<Network>" in the top navigation bar
    When I tap on the Settings tab option
    And In settings I tap on "Networks"
    And the network screen is displayed
    And I tap on network "<Network>" on networks screen
    And I tap the "Delete" button
    Then "<Network>" should be removed from the list of RPC networks
    Examples:
      | Network      | rpcUrl                 | ChainID |  |
      | Celo Mainnet | https://forno.celo.org | 42220   |  |
