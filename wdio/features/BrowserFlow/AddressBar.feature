@androidApp 
@regression
Feature: This feature file covers address view functionality in the browser.

  Scenario: Address bar
    Navigate to websites using browser address bar.

    Given I have imported my wallet
    And I tap No Thanks on the Enable security check screen
    And I tap No thanks on the onboarding welcome tutorial
    And I navigate to the browser
    And I have 1 browser tab displayed

    When I tap on address bar
    Then browser address view is displayed
    And the "https://home.metamask.io/" url is displayed in address field

    When I tap on "clear icon" in address field
    Then address field is cleared

    When I tap on "Cancel button" in address field
    Then browser address bar input view is no longer displayed
    And the browser view is on the "https://home.metamask.io/" website

    When I tap on address bar
    And I navigate to "reddit.com"
    Then the browser view is on the "https://www.reddit.com/" website
