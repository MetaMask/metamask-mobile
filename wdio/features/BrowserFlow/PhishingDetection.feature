@androidApp 
@smoke
@browser
Feature: Browser Phishing Detection

  Scenario: Visiting a malicious website prompts the user with the phishing detection warning
    Given the app displayed the splash animation
    And I have imported my wallet
    And I tap No Thanks on the Enable security check screen
    And I tap No thanks on the onboarding welcome tutorial
    And I navigate to the browser
    And I have 1 browser tab displayed
    And I am on Home MetaMask website
    When I navigate to "http://www.empowr.com/FanFeed/Home.aspx"
    Then I should see a warning screen with Ethereum Phishing Detection title
    When I tap the Back button on Phishing Detection page
    And the browser view is on the "https://home.metamask.io/" website
