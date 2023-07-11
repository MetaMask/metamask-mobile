@androidApp
@regression
@browser
Feature: Browser Options Menu

  Scenario: Import wallet
    Given the app displayed the splash animation
    And I have imported my wallet
    And I tap No Thanks on the Enable security check screen
    And I tap No thanks on the onboarding welcome tutorial

  Scenario: The user navigates to the Browser screen
    When I navigate to the browser
    And I am on Home MetaMask website
    And I navigate to "https://app.uniswap.org/"
    Then the browser view is on the "https://app.uniswap.org/" website

  Scenario: Reload options
    When I tap on browser control menu icon on the bottom right of the browser view
    Then browser options menu is displayed
    And "Reload" option item is displayed in browser options menu
    When I tap the "Reload" option on the Option Menu
    Then active browser tab is refreshed
    And the browser view is on the "https://app.uniswap.org/" website

  Scenario: Share options
    When I tap on browser control menu icon on the bottom right of the browser view
    Then browser options menu is displayed
    And "Share" option item is displayed in browser options menu
    When I tap the "Share" option on the Option Menu
    Then device component is displayed to share current address URL

  Scenario: Switch network options
    When I tap on the Network Icon
    And I select "Goerli Test Network" network option
    Then "Goerli Test Network" should be displayed in network educational modal

  Scenario: New Tab options
    When I tap on browser control menu icon on the bottom right of the browser view
    Then browser options menu is displayed
    And "New tab" option item is displayed in browser options menu
    When I tap the "New Tab" option on the Option Menu
    Then new browser tab is added
    #And the browser view is on the "https://home.metamask.io/" website
