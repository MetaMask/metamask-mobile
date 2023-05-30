@androidApp
@confirmations
@regression

Feature: Approving an ERC20 token from a dapp
  A user should be able to approve an ERC20 token from a dapp.

  Scenario: Import wallet
    Given the app displayed the splash animation
    And I have imported my wallet
    And I tap No Thanks on the Enable security check screen
    And I tap No thanks on the onboarding welcome tutorial
  
  Scenario: Approve an ERC20 token from a dapp with default amount
    Given Ganache server is started
    And I close the Whats New modal
    And Ganache network is selected
    And ERC20 token contract is deployed
    When I navigate to the browser
    And I am on Home MetaMask website
    And I navigate to "test-dapp-erc20"
    And I connect my active wallet to the test dapp
    And I scroll to the ERC20 section
    And I approve ERC20 tokens
    Then the transaction is submitted with Transaction Complete! toast appearing
    Then Ganache server is stopped