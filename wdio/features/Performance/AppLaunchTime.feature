@androidApp 
@performance
Feature: App Cold Start Launch Times
  This feature measures the cold start of the app when:
  The user installs the app for the very first time
  The user imports a wallet

  Scenario: Measure cold start launch time on fresh install
    Given the app is launched
    When the app displayed the splash animation
    Then the app should launch within "4" seconds

  Scenario: Measure cold start launch time after importing a wallet
    Given the splash animation disappears
    And I have imported my wallet
    And I tap No Thanks on the Enable security check screen
    And I tap No thanks on the onboarding welcome tutorial
    And I am on the wallet view
    When I kill the app
    And I relaunch the app
    And the timer starts running
    And the app displayed the splash animation
    And the splash animation disappears
    And I fill my password in the Login screen
    And I log into my wallet
    Then the app should launch within "14" seconds
