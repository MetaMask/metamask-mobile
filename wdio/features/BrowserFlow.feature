@androidApp
Feature: This feature file covers all core flow in the browser.

  Scenario: Switching wallet accounts while connected to a dapp.
  Use the search bar on the homepage to return a popular defi
  apps as a suggested search, connect to the dapp and then switch accounts

    Given I have imported my wallet
    And I am on browser view
    And I am on "https://home.metamask.io"
    When I input "https://app.sushi.com/swap" in the search field
    Then "https://app.sushi.com/swap" is a suggestion listed
    When I tap on "https://app.sushi.com/swap" on the suggestion list
    Then the browser view is on "https://app.sushi.com/swap"
    And "Account 1" is the active wallet account
    And "Account 1" wallet is connected to Sushi Swap
    When I tap on the account icon located in the upper right of the browser view
    Then select account component is displayed
    When I tap on "Account 2" on account list
    Then "Account 2" is now active in the app
    And "Account 2" wallet is connected to Sushi Swap
    When I navigate to "https://curve.fi"
    And I connect my wallet to "https://curve.fi"
    Then wallet is connected to "https://curve.fi"

  Scenario: Adding browser Favorites
  Add, click and delete favorites. Display favorites in the Favorites tab of home.metamask.io

    Given I am on browser view
    And I have 1 browser tab displayed
    And I am on "https://home.metamask.io"
    And I have no favorites saved
    When I navigate to "https://app.sushi.com/swap"
    And I tap on browser control menu icon on the bottom right of the browser view
    And I tap "Add to Favorites" on the browser option menu
    Then "Add Favorite" view is displayed
    And Name field is pre populated with "Sushi"
    And Url field is pre populated with "https://sushiswap.io"
    When I tap on "Cancel" on the Add Favorite Screen
    Then "https://app.sushi.com/swap" is displayed in the browser tab
    And the favorite is not added on the home "https://home.metamask.io" page
    When I navigate to "https://app.sushi.com/swap"
    And I tap on browser control menu icon on the bottom right of the browser view
    And I tap the "Add to Favorites" option on the Option Menu
    Then "Add Favorite" view is displayed
    And Name field is pre populated with "Sushi"
    And Url field is pre populated with "https://app.sushi.com/swap"
    When I input "My Sushiswap" in the favorite name field
    And I input "https://app.sushi.com/swap" in my favorite url field
    And I tap on "Add" on the Add Favorite Screen
    Then the "Sushiswap" is displayed in the browser tab
    When I tap on the browser home button
    And I tap on Favorites on Home Website
    Then favorite card title is "My Sushiswap"
    And favorite card URL is "https://sushiswap.io/swap"

  Scenario: ENS website loads correctly
  Navigate to ENS website using browser address bar.

    Given I am on browser view
    And I have 1 browser tab displayed
    And I am on "https://home.metamask.io"
    When I navigate to "https://brunobarbieri.eth"
    Then the webpage should load successfully

  Scenario: Visiting a malicious website prompts the user with the phishing detection warning
    Given I am on browser view
    And I have 1 browser tab displayed
    And I am on "https://home.metamask.io"
    When I navigate to "http://www.empowr.com/FanFeed/Home.aspx"
    Then I should see a warning screen with Ethereum Phishing Detection title
    When I tap on the "Back to Safety" button
    Then I am taken back to the home page

  Scenario: Searching an invalid url and prompts the user with an error message
    Given I am on browser view
    And I have 1 browser tab displayed
    And I am on "https://home.metamask.io"
    When I navigate to "https://quackquakc.easq"
    Then I should see "Something went wrong. We couldn't load that page"
    When I tap on "Return to home page"
    Then I am taken back to the home page

  Scenario: Address bar
  Navigate to websites using browser address bar.

    Given I am on browser view
    And I have 1 browser tab displayed
    When I tap on address bar
    Then browser address bar input view is displayed
    And "https://home.metamaks.io" is displayed in address field
    When I tap on "clear icon" in address field
    Then address field is cleared
    When I tap on "Cancel button" in address field
    Then browser address bar input view is no longer displayed
    And the "https://home.metamask.io" is displayed in active browser tab
    When I tap on address bar
    And I input "reddit.com" in address field
    And I tap on device Go or Next button
    Then the browser view is on "https://www.reddit.com"

  Scenario: Navigation with browser controls
  Use the browser controls at the bottom of the view to go back,
  forward, search, multi-browser tab view and home button.

    Given I am on browser view
    And I have 1 browser tab displayed
    And I am on "https://home.metamask.io"
    When I navigate to "reddit.com"
    And I tap on the back arrow control button
    Then the browser view is on "http://home.metamask.io"
    When I tap on forward arrow control button
    Then the browser view is on "reddit.com"
    When I tap on search button
    Then browser address bar input view is displayed
    When I tap on browser tab button with count 1
    Then multi browser tab view is displayed
    When I tap on "Add" button on multi browser tab view
    Then new browser tab is displayed on "http://home.metamask.io"
    And browser tab count is 2
    When I tap on browser tab button with count 2
    And I tap on "Close All" button on multi browser tab view
    Then all browser tabs are closed
    When I tap on "Add" button on multi browser tab view
    And I tap on "Decentralized finance"
    And I tap on "Curve" resource card
    And I tap on the browser home button
    Then the browser view is on "https://home.metamask.io"

  Scenario: Browser options
  New tab, reload, share, open in browser, and switch network.

    Given I am on browser view
    And I am on "https://home.metamask.io"
    When I tap on browser control menu icon on the bottom right of the browser view
    Then browser options menu is displayed
    And "New tab" option item is displayed in browser options menu
    And "Switch network" option item is displayed in browser options menu
    When I navigate to "https://app.sushi.com/swap"
    And I tap on browser control menu icon on the bottom right of the browser view
    And "New tab" option item is displayed in browser options menu
    And "Reload" option item is displayed in browser options menu
    And "Add to Favorites" option item is displayed in browser options menu
    And "Share" option item is displayed in browser options menu
    And "Open in browser" option item is displayed in browser options menu
    And "Switch network" option item is displayed in browser options menu
    When I tap the "New Tab" option on the Option Menu
    Then new browser tab is added
    And new browser is on homepage
    When I navigate to "https://curve.fi"
    And I connect my wallet to "https://curve.fi"
    And I tap on browser control menu icon on the bottom right of the browser view
    And I tap the "Reload" option on the Option Menu
    Then active browser tab is refreshed
    And active browser is on "https://curve.fi"
    And wallet is connected to "https://curv.fi"
    When I tap on browser control menu icon on the bottom right of the browser view
    And I tap the "Add to Favorites" option on the Option Menu
    Then "Add Favorite" view is displayed
    When I input "Curve Financial" in the favorite name field
    And I input "https://curve.fi/pools" in my favorite url field
    And I tap on "Add" on the Add Favorite Screen
    And I tap on the browser home button
    And I tap on Favorites on Home Website
    Then favorite card title is "Curve Financial"
    And favorite card URL is "https://curve.fi/pools"
    When I tap on Curve Financial favorite card
    Then the browser view is on "https://curve.fi/pools"
    When I tap on browser control menu icon on the bottom right of the browser view
    Then "Add Favorite" is not displayed in browser options menu
    When I tap the "Share" option on the Option Menu
    Then device component is displayed to share current address URL
    When I tap on browser control menu icon on the bottom right of the browser view
    Then device component to select browser is displayed
    But device may auto switch to device default browser without showing device component
    And device browser is on "https://curve.fi/pools"
    When I tap on browser control menu icon on the bottom right of the browser view
    And I tap the "Switch network" option on the Option Menu
    And I select "BNB Smart Chain"
    Then "BNB Smart Chain" is selected for MMM app
    And active browser tab is showing "https://curve.fi/pools"
    And wallet is no longer connected to "https://curve.fi/pools"
