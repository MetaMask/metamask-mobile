@androidApp
@confirmations
@regression

Feature: Sending ETH to a Multisig
  A user should be able to send ETH to a Multisig address.

  Scenario: Import wallet
    Given the app displayed the splash animation
    And I have imported my wallet
    And I tap No Thanks on the Enable security check screen
    And I tap No thanks on the onboarding welcome tutorial
  
  Scenario Outline: Sending ETH to a Multisig address from inside MetaMask wallet
    Given Ganache server is started
    And I close the Whats New modal
    And Ganache network is selected
    And Multisig contract is deployed
    When On the Main Wallet view I tap "ETHER"
    And On the Main Wallet view I tap "Send"
    And I enter address "MultisigAddress" in the sender's input box
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
      | Amount |
      | 1      |