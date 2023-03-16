@androidApp @ChainScenarios
Feature: Terms of Use

  Scenario: Install and launch app
    Given the Welcome Screen is displayed
    When I tap "Get started"
    Then "Wallet setup" is displayed
    When I tap "Import using Secret Recovery Phrase"
    Then "Help us improve MetaMask" is displayed
    When I tap "I agree"
    Then Terms of Use is displayed

  Scenario: Attempt to bypass ToU without accepting terms
    When I kill the app
    And I relaunch the app
    Then the Welcome Screen is displayed
    When I tap "Get started"
    Then "Wallet setup" is displayed
    When I tap "Import using Secret Recovery Phrase"
    Then Terms of Use is displayed

  Scenario: Agree to terms
    When I agree to terms
    Then Terms of Use is not displayed

  Scenario: Restart app after accepting terms
    When I kill the app
    And I relaunch the app
    Then Terms of Use is not displayed
