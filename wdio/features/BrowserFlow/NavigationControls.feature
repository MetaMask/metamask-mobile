@androidApp 
@regression
@browser
Feature: Browser Control Options

  Scenario: Navigation with browser controls
  Use the browser controls at the bottom of the view to go back,
  forward, search, multi-browser tab view and home button.
    Given the app displayed the splash animation
    And I have imported my wallet
    And I tap No Thanks on the Enable security check screen
    And I tap No thanks on the onboarding welcome tutorial
    And I navigate to the browser
    And I have 1 browser tab displayed
    And I am on Home MetaMask website
    When I navigate to "reddit.com"
    Then the browser view is on the "https://www.reddit.com/" website
    And I tap on the back arrow control button
    Then the browser view is on the "https://home.metamask.io/" website
    When I tap on browser tab button with count 1
    Then multi browser tab view is displayed
    When I tap on "Add" button on multi browser tab view
    Then browser tab count is 2
    When I tap on browser tab button with count 2
    And I tap on "Close All" button on multi browser tab view
    Then all browser tabs are closed
