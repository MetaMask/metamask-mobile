@androidApp 
@smoke
@browser
Feature: Browser Invalid URL

  Scenario: Searching an invalid url and prompts the user with an error message
    Given the app displayed the splash animation
    And I have imported my wallet
    And I tap No Thanks on the Enable security check screen
    And I tap No thanks on the onboarding welcome tutorial
    And I navigate to the browser
    When I navigate to "https://quackquakc.easq"
    Then I should see "Something went wrong" error title
    And I should see "We couldn't load that page" error message
    When I tap on the Return button from the error page
    Then the browser view is on the "https://home.metamask.io/" website
