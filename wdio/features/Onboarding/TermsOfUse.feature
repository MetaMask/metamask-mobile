@androidApp @ChainScenarios
Feature: Terms of Use

  Scenario: Install and launch app
    Given I just installed MetaMask on my device
    When I launch MetaMask mobile app
    Then Terms of Use is displayed

  Scenario: Attempt to bypass ToU without accepting terms
    When I attempt to dismiss Terms of Use without agreeing to terms
    Then Terms of Use is displayed
    When I kill the app
    And I relaunch the app
    Then Terms of Use is displayed

  Scenario: Agree to terms
    When I agree to terms
    Then Terms of Use is not displayed

  Scenario: Restart app after accepting terms
    When I kill the app
    And I relaunch the app
    Then the Welcome Screen is displayed
    And Terms of Use is not displayed
