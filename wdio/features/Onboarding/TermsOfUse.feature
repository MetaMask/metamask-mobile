@androidApp
@regression
@onboarding
Feature: Onboarding Terms of Use

  Scenario: Install and launch app
    Given the app displayed the splash animation
    And the Welcome Screen is displayed
    When I tap "Get started"
    Then Terms of Use is displayed

  Scenario: Attempt to bypass ToU without accepting terms
    When I kill the app
    And I relaunch the app
    And the app displayed the splash animation
    Then the Welcome Screen is displayed
    When I tap "Get started"
    Then Terms of Use is displayed

  Scenario: Agree to terms
    When I agree to terms
    Then Terms of Use is not displayed

  Scenario: Restart app after accepting terms
    When I kill the app
    And I relaunch the app
    And the app displayed the splash animation
    Then the Welcome Screen is displayed
    When I tap "Get started"
    Then Terms of Use is not displayed
