@androidApp
@confirmations
@regression

Feature: Send ETH with Gas API down
  A user should be able to send ETH when the Gas API is down.
  @ganache
  @mock
  @gasApiDown
  Scenario: should display fallback gas properties on the Gas Edit screen
    Given the app displayed the splash animation
    And I have imported my wallet
    And I tap No Thanks on the Enable security check screen
    And I tap No thanks on the onboarding welcome tutorial
    And Ganache network is selected
    When On the Main Wallet view I tap on the Send Action
    And I enter address "0x1FDb169Ef12954F20A15852980e1F0C122BfC1D6" in the sender's input box
    And I tap button "Next" on Send To view
    Then I proceed to the amount view
    When I type amount "1" into amount input field
    And I tap button "Next" on the Amount view
    Then I should be taken to the transaction confirmation view
    And the token amount 1 to be sent is visible
    When I tap Edit Gas link
    Then suggested gas options should not be visible
    When I tap Save Gas Values
    When I tap button "Send" on Confirm Amount view
    Then I am on the main wallet view
    When I tap on the Activity tab option
    Then "Sent ETH" transaction is displayed