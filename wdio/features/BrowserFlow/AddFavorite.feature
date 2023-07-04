@androidApp 
@smoke
@browser
Feature: Browser Add Favorite

  Scenario: Adding browser Favorites
  Add, click and delete favorites. Display favorites in the Favorites tab of home.metamask.io

    Given the app displayed the splash animation
    And I have imported my wallet
    And I tap No Thanks on the Enable security check screen
    And I tap No thanks on the onboarding welcome tutorial
    And I navigate to the browser
    And I have 1 browser tab displayed
    And I am on Home MetaMask website
    And I have no favorites saved
    When I navigate to "https://uniswap.exchange"
    And I tap on browser control menu icon on the bottom right of the browser view
    And I tap the "Add to Favorites" option on the Option Menu
    Then "Add Favorites" view is displayed
    And Name field is pre populated with "Uniswap Interface"
    And Url field is pre populated with "https://app.uniswap.org/"
    When I tap on "Cancel" on the Add Favorite Screen
    Then the "https://app.uniswap.org/" is displayed in the browser tab
    And the favorite is not added on the home "https://home.metamask.io" page
    When I navigate to "https://uniswap.exchange"
    And I tap on browser control menu icon on the bottom right of the browser view
    And I tap the "Add to Favorites" option on the Option Menu
    Then "Add Favorites" view is displayed
    And Name field is pre populated with "Uniswap Interface"
    And Url field is pre populated with "https://app.uniswap.org/"
    When I input "My Uniswap" in the favorite name field
    And I input "https://uniswap.exchange" in my favorite url field
    And I tap on "Add" on the Add Favorite Screen
    Then the "https://app.uniswap.org/" is displayed in the browser tab
    When I tap on the browser home button
    And I tap on Favorites on Home Website
    Then favorite card title My Uniswap is Displayed
    And favorite card URL My Uniswap is Displayed
