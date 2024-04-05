@androidApp
@regression
@security-privacy
Feature: Security & Privacy Remember Me

  Scenario: Enabling remember me and verifying that the app does not require password authentication after remember me is enabled.
    Given the app displayed the splash animation
    And I have imported my wallet
    And I tap No Thanks on the Enable security check screen
    And I tap No thanks on the onboarding welcome tutorial
    When I tap on the Settings tab option
    And In settings I tap on "Security & Privacy"
    Then on Security & Privacy screen I toggle on Remember me
    When I kill the app
    And I relaunch the app
    And the app displayed the splash animation
    And the splash animation disappears
    And I fill my password in the Login screen
    And I toggle Remember Me on Login screen
    And I log into my wallet
    Then I am on the wallet view
    When I kill the app
    And I relaunch the app
    And the app displayed the splash animation
    And the splash animation disappears
    Then I am on the wallet view
