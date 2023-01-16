@androidApp
Feature: This feature file covers all the navigation control options in browser.

  Scenario: Navigation with browser controls
  Use the browser controls at the bottom of the view to go back,
  forward, search, multi-browser tab view and home button.

    Given I have imported my wallet
    And I tap No Thanks on the Enable security check screen
    And I tap No thanks on the onboarding welcome tutorial
    And I navigate to the browser
    And I have 1 browser tab displayed
    And I am on Home MetaMask website
    When I navigate to "reddit.com"
    Then the browser view is on the Reddit website
    And I tap on the back arrow control button
    Then the browser view is on Home MetaMask website
    When I tap on forward arrow control button
    Then the browser view is on the Reddit website
    When I tap on search button
    Then browser address bar input view is displayed
    When I tap on browser tab button with count 1
    Then multi browser tab view is displayed
    When I tap on "Add" button on multi browser tab view
    Then new browser tab is displayed on "https://home.metamask.io/"
    And browser tab count is 2
    When I tap on browser tab button with count 2
    And I tap on "Close All" button on multi browser tab view
    Then all browser tabs are closed
    When I tap on "Add" button on multi browser tab view
    Then the browser view is on Home MetaMask website
