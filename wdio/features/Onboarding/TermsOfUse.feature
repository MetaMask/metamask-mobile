@androidApp @ChainScenarios
Feature: Terms of Use

  Scenario: Install and launch app
    Given the app displayed the splash animation
    When the splash animation disappears
    Then Terms of Use is displayed

  Scenario: Attempt to bypass ToU without accepting terms
    When I attempt to dismiss Terms of Use without agreeing to terms
    Then Terms of Use is displayed
    When I kill the app
    And I relaunch the app
    And the app displayed the splash animation
    And the splash animation disappears
    Then Terms of Use is displayed

  Scenario: Agree to terms
    When I agree to terms
    Then Terms of Use is not displayed

  Scenario: Restart app after accepting terms
    When I kill the app
    And I relaunch the app
    And the app displayed the splash animation
    And the splash animation disappears
    Then the Welcome Screen is displayed
    And Terms of Use is not displayed
