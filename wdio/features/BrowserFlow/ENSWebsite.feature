@androidApp
@regression
@browser
@smoke
Feature: Browser ENS Website

  Scenario: ENS website loads correctly
  Navigate to ENS website using browser address bar.
    Given the app displayed the splash animation
    And I have imported my wallet
    And I tap No Thanks on the Enable security check screen
    And I tap No thanks on the onboarding welcome tutorial
    And I navigate to the browser
    And I am on Home MetaMask website
    When I navigate to "https://brunobarbieri.eth.link"
    Then the webpage should load successfully
