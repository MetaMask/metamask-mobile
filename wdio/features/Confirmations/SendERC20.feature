@androidApp
@confirmations
@regression

Feature: Send an ERC20 token
  A user should be able to send an ERC20.
  @ganache
  @erc20
  Scenario: should successfully send an ERC20 token from a dapp
    Given I have imported my wallet
    And I tap No Thanks on the Enable security check screen
    And I tap No thanks on the onboarding welcome tutorial
    And Ganache network is selected
    When I navigate to the browser
    And I am on Home MetaMask website
    When I navigate to "test-dapp-erc20"
    And I connect my active wallet to the test dapp
    And I scroll to the ERC20 section
    And I transfer ERC20 tokens
    When I tap on the Activity tab option
    Then "Sent Tokens" transaction is displayed