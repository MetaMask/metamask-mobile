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