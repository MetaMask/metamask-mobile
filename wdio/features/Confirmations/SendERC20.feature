@androidApp
@confirmations
@regression
Feature: Sending an ERC20 token from a dapp
  User should be able to send an ERC20 token from a dapp.

  Scenario: Import wallet
    Given the app displayed the splash animation
    And I have imported my wallet
    And I tap No Thanks on the Enable security check screen
    And I tap No thanks on the onboarding welcome tutorial

  Scenario: Send ERC20 token from a dapp
    Given Ganache server is started
    And Ganache network is selected

    When I navigate to the browser
    And I am on Home MetaMask website

    When I navigate to "test-dapp-erc20"
    And I connect my active wallet to the test dapp
    And I scroll to the ERC20 section
    And I transfer ERC20 tokens
    Then the transaction is submitted with Transaction Complete! toast appearing
