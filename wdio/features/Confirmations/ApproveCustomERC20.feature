@androidApp
@confirmations
@regression

Feature: Approve an ERC20 token with custom amount
  A user should be able to approve an ERC20 token from a dapp setting a custom amount.
  @ganache
  @erc20
  Scenario: should approve successfully the custom token amount I set
    Given I have imported my wallet
    And I tap No Thanks on the Enable security check screen
    And I tap No thanks on the onboarding welcome tutorial
    And Ganache network is selected
    When I navigate to the browser
    And I am on Home MetaMask website
    And I navigate to "test-dapp-erc20"
    And I connect my active wallet to the test dapp
    And I scroll to the ERC20 section
    And I approve the custom ERC20 token amount
    Then the transaction is submitted with Transaction Complete! toast appearing