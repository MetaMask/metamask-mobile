@androidApp @ChainScenarios @regression
Feature: This feature file covers the option menu in the browser.

  Scenario: Reload options
    Given I have imported my wallet
    And I tap No Thanks on the Enable security check screen
    And I tap No thanks on the onboarding welcome tutorial
    And I navigate to the browser
    And I am on Home MetaMask website
    When I navigate to "https://app.uniswap.org/"
    And the browser view is on Uniswap Page
    When I tap on browser control menu icon on the bottom right of the browser view
    Then browser options menu is displayed
    And "Reload" option item is displayed in browser options menu
    When I tap the "Reload" option on the Option Menu
    Then active browser tab is refreshed
    And the browser view is on Uniswap Page

  Scenario: Share options
    Given I am on the browser view
    And the browser view is on Uniswap Page
    When I tap on browser control menu icon on the bottom right of the browser view
    Then browser options menu is displayed
    And "Share" option item is displayed in browser options menu
    When I tap the "Share" option on the Option Menu
    Then device component is displayed to share current address URL

  Scenario: Switch network options
    Given I am on the browser view
    And the browser view is on Uniswap Page
    When I tap on browser control menu icon on the bottom right of the browser view
    Then browser options menu is displayed
    And "Switch network" option item is displayed in browser options menu
    When I tap the "Switch network" option on the Option Menu
    And I select "Goerli" network option
    Then "Goerli" is selected for MMM app

  Scenario: New Tab options
    Given I am on the browser view
    And the browser view is on Uniswap Page
    When I tap on browser control menu icon on the bottom right of the browser view
    Then browser options menu is displayed
    And "New tab" option item is displayed in browser options menu
    When I tap the "New Tab" option on the Option Menu
    Then new browser tab is added
    And the browser view is on Home MetaMask website
