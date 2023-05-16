@androidApp
@confirmations
@regression

Feature: Sending ETH to an EOA
  A user should be able to send ETH to another EOA address.

  Scenario: Import wallet
    Given the app displayed the splash animation
    And I have imported my wallet
    And I tap No Thanks on the Enable security check screen
    And I tap No thanks on the onboarding welcome tutorial

  Scenario Outline: Setting up Ganache local network
    Given Ganache server is started
    And I close the Whats New modal
    When I tap on the Settings tab option
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
      | Localhost 8545 | http://localhost:8545  | 1337    | ETH    |

  Scenario Outline: Sending ETH to an EOA from inside MetaMask wallet
    When On the Main Wallet view I tap "ETHER"
    And On the Main Wallet view I tap "Send"
    And I enter address "<Address>" in the sender's input box
    When I tap button "Next" on Send To view
    Then I proceed to the amount view

    When I type amount "<Amount>" into amount input field
    And I tap button "Next" on the Amount view
    Then I should be taken to the transaction confirmation view
    And the token amount <Amount> to be sent is visible

    When I tap button "Send" on Confirm Amount view
    Then I am taken to the token overview screen
    And the transaction is submitted with Transaction Complete! toast appearing
    Then Ganache server is stopped

    Examples:
      | Address                                    | Amount |
      | 0x1FDb169Ef12954F20A15852980e1F0C122BfC1D6 | 1      |
