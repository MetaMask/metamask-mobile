@androidApp @regression
Feature: This feature file cover the switch account on the browser flow.

  Scenario: Switching accounts while connected to a dapp.
    Use the search bar on the homepage to return a popular defi
    apps as a suggested search, connect to the dapp and then switch accounts

    Given I have imported my wallet
    And I tap No Thanks on the Enable security check screen
    And I tap No thanks on the onboarding welcome tutorial
    And I navigate to the browser
    And I am on Home MetaMask website

    When I input "Uniswap" in the search field
    Then Uniswap exchange page is a suggestion listed

    When I tap on Uniswap exchange page on the suggestion list
    Then the browser view is on the "https://app.uniswap.org/" website
    #When I connect my active wallet to the Uniswap exchange page
    #Then active wallet is connected to Uniswap
    And "Account 1" is the active wallet account

    #When I tap on the account icon located in the upper right of the browser view
    When I tap on the account icon on the Wallet screen
    Then select account component is displayed

    When I tap on Create a new account
    Then the created account is selected
    And "Account 2" is the active wallet account

#And active wallet is connected to Uniswap