@androidApp
@confirmations
@regression

Feature: Send an ERC721 token
  A user should be able to send an ERC721 token.
  @ganache
  @erc721
  Scenario: should successfully send an ERC721 token from a dapp
    Given I have imported my wallet
    And I tap No Thanks on the Enable security check screen
    And I tap No thanks on the onboarding welcome tutorial
    And Ganache network is selected
    When I navigate to the browser
    And I am on Home MetaMask website
    When I navigate to "test-dapp-erc721"
    And I connect my active wallet to the test dapp
    And I scroll to the ERC721 section
    And I transfer an ERC721 token
    When I tap on the Activity tab option
    Then "Sent Collectible" transaction is displayed