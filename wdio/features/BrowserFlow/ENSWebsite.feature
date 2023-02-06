@androidApp @regression
Feature: This feature file covers ENS website in browser.

  Scenario: ENS website loads correctly
    Navigate to ENS website using browser address bar.

    Given I have imported my wallet
    And I tap No Thanks on the Enable security check screen
    And I tap No thanks on the onboarding welcome tutorial
    And I navigate to the browser
    And I have 1 browser tab displayed
    And I am on Home MetaMask website

    When I navigate to "https://brunobarbieri.eth"
    Then the webpage should load successfully
