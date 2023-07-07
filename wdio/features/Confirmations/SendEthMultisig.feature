@androidApp
@confirmations
@regression

Feature: Send ETH to a Multisig
  A user should be able to send ETH to a Multisig address.
  @ganache
  @multisig
  Scenario: should successfully send ETH to a Multisig address from inside MetaMask wallet
    Given I have imported my wallet
    And I tap No Thanks on the Enable security check screen
    And I tap No thanks on the onboarding welcome tutorial
    And Ganache network is selected
    When On the Main Wallet view I tap on the Send Action
    And I enter address "MultisigAddress" in the sender's input box
    When I tap button "Next" on Send To view
    Then I proceed to the amount view
    When I type amount "1" into amount input field
    And I tap button "Next" on the Amount view
    Then I should be taken to the transaction confirmation view
    And the token amount 1 to be sent is visible
    When I tap button "Send" on Confirm Amount view
    Then I am on the main wallet view
    When I tap on the Activity tab option
    Then "Smart contract interaction" transaction is displayed