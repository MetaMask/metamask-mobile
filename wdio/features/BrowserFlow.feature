@androidApp
Feature:  This feature file covers all core flow in the browser.

  Scenario: Switching wallet accounts while connected to a dapp.
  Use the search bar on the homepage to return a popular defi
  apps as a suggested search, connect to the dapp and then switch accounts

    Given I am on browser view
    And I am on "https://home.metamask.io"
    When I input "Uniswap" in the search field
    Then suggested defi app will be displayed while typing
    And "https://uniswap.exchange" is the top suggestion
    When I tap "https://uniswap.exchange"
    Then the browser view is on "https://uniswap.exchange"
    And "Account 1" is the active wallet account
    And "Account 1" wallet is connected to "https://uniswap.exchange"
    When I tap the account icon located in the upper right of the browser view
    Then select account component is displayed
    When I tap "Account 2"
    Then "Account 2" is now active in the app
    And account icon for "Account 2" is displayed
    And "Account 2" wallet is connected to "https://uniswap.exchange"
    When I navigate to "https://curve.fi"
    And I connect "Account 2" wallet to "https://curve.fi"
    Then "https://curve.fi" shows "Account 2" is connected


  Scenario: Adding browser Favorites
  Add, click and delete favorites. Display favorites in the Favorites tab of home.metamask.io

    Given I am on the browser view
    And I have one browser tab displayed
    And I have no favorites saved
    And I am on "https://home.metamask.io"
    When I navigate to "sushiswap"
    And I tap browser control menu icon on the bottom right of the browser view
    And I tap "Add to Favorites"
    Then "Add Favorite" view is displayed
    And Name field is prepopulated with "Sushiswap"
    And Url field is prepopulated with "https://sushiswap.io"
    When I tap "Cancel"
    Then "Sushiswap" is displayed in the browser tab
    And the favorite is not added
    When I tap browser control menu icon on the bottom right of the browser view
    And I tap "Add to Favorites"
    Then "Add Favorite" view is displayed
    And Name field is prepopulated with "Sushiswap"
    And Url field is prepopulated with "https://sushiswap.io"
    When I input "My Sushiswap" in the favorite name field
    And I input "https://sushiswap.io/swap"
    And I tap "Add"
    Then "Sushiswap" is displayed
    When I tap the browser home button
    And I tap Favorites on home.metamask.io
    Then only one favorite is displayed
    And favorite card title is "My Sushiswap"
    And favorite card URL is "https://sushiswap.io/swap"


  Scenario: ENS website loads correctly
  Navigate to ENS website using browser address bar.

    Given I am on the browser view
    And I have one browser tab displayed
    And I am on "https://home.metamask.io"
    When I navigate to "https://brunobarbieri.eth"
    Then the webpage should load successfully

  Scenario: Visiting a malicilous website prompts the user with the phishing detection warning

    Given I am on the browser view
    And I have one browser tab displayed
    And I am on "https://home.metamask.io"
    When I navigate to "http://www.empowr.com/FanFeed/Home.aspx"
    Then I should see a warning screen with "Ethereum Phishing Detection"
    And I should see some text explaining why the site I searched is malicious
    And I should see a "Back to Safety" button
    When I tap on the "Back to Safety" button
    Then I am taken back to the home page

  Scenario: Searching an invalid url and prompts the user with an error message

    Given I am on the browser view
    And I have one browser tab displayed
    And I am on "https://home.metamask.io"
    When I navigate to "https://quackquakc.easq"
    Then I should see "Something went wrong. We couldn't load that page"
    And a blue button with "Return to home page" should be visible
    When I tap on "Return to home page"
    Then I am taken back to the home page`

  Scenario: Address bar
  Navigate to websites using browser address bar.

    Given I am on browser view
    And I have one browser tab active
    When I tap on address bar
    Then browser address bar input view is displayed
    And "https://home.metamaks.io" is displayed in address field
    When I tap clear icon in address field
    Then address field is cleared
    When I tap "Cancel"
    Then browser address bar input view is no longer displayed
    And "https://home.metamask.io" is displayed in active browser tab
    When I tap on address bar
    And I input "reddit.com" in address field
    And I tap device Go or Next button
    Then browser navigates to "https://www.reddit.com"


  Scenario: Navigation with browser controls
  Use the browser controls at the bottom of the view to go back,
  forward, search, multi-browser tab view and home button.
    Given I am on browser view
    And I have one active browser tab
    And I am on "https://home.metamask.io"
    When I navigate to "reddit.com"
    And I tap the back arrow control button
    Then browser navigates to "http://home.metamask.io"
    When I tap on forward arrow control button
    Then browser navigates to "reddit.com"
    When I tap search button
    Then address bar search view is displayed
    When I tap browser tab button with count 1
    Then multi browser tab view is displayed
    When I tap add/plus icon
    Then new browser tab is created
    And new browser tab is displayed
    And browser tab count is 2
    When I tap browser tab button with count 2
    And I tap "Close All"
    Then all browser tabs are closed
    And no browser tab is active
    And "No Open Tabs" is displayed
    When I tap add/plus icon
    And I tap "Decentralized finance"
    And I tap "Curve" resource card
    And i tap Home button
    Then browser navigates to "https://home.metamask.io"


  Scenario: Browser options
  New tab, reload, share, open in browser, and switch network.

    Given I am on browser view
    And I am on browser homepage
    When I tap browser options icon on bottom right of browser view
    Then browser options menu is displayed
    And "New tab" option item is displayed in browser options menu
    And "Switch network" option item is displayed in browser options menu
    When I navigate to "https://uniswap.exchange"
    And I tap browser options icon on bottom right of browser view
    And "New tab" option item is displayed in browser options menu
    And "Reload" option item is displayed in browser options menu
    And "Add to Favorites" option item is displayed in browser options menu
    And "Share" option item is displayed in browser options menu
    And "Open in browser" option item is displayed in browser options menu
    And "Switch network" option item is displayed in browser options menu
    When I tap "New Tab"
    Then new browser tab is added
    And new browser tab is active
    And new browser is on homepage
    When I navigate to "https://curve.fi"
    And I connect my wallet to "https://curve.fi"
    And I tap browser options icon on bottom right of browser view
    And I tap "Reload"
    Then active browser tab is refreshed
    And active browser is on "https://curve.fi"
    And wallet is connected to "https://curv.fi"
    When I tap browser options icon on bottom right of browser view
    And I tap "Add to Favorites"
    Then "Add Favorite" view is displayed
    When I input "Curve Financial" in name field
    And I input "https://curve.fi/pools"
    And I tap "Add" button
    And I tap home button
    And I tap "Favorites" tab
    Then "Curve Financial" favorite is displayed in favorites list
    And "Curve Financial" URL is "https://curve.fi/pools"
    When I tap on "Curve Financial" favorite
    Then browser navigates to "https://curve.fi/pools"
    When I tap browser options icon on bottom right of browser view
    Then "Add Favorite" is not displayed in browser options menu
    When I tap "Share"
    Then device component is displayed to share current address URL
    When I tap browser options icon on bottom right of browser view
    Then device component to select browser is displayed
    But device may auto switch to device default browser without showing device component
    And device browser is on "https://curve.fi/pools"
    When I tap browser options icon on bottom right of browser view
    And I tap "Switch network"
    And I select "BNB Smart Chain"
    Then "BNB Smart Chain" is selected for MMM app
    And active browser tab is showing "https://curve.fi/pools"
    And wallet is no longer connected to "https://curve.fi/pools"
