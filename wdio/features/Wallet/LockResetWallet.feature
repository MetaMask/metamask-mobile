@androidApp
@smoke
@wallet
Feature: Lock and Reset Wallet

  Scenario: Import account
    Given the app displayed the splash animation
    And I have imported my wallet
    And I tap No Thanks on the Enable security check screen
    And I tap No thanks on the onboarding welcome tutorial

  Scenario Outline: Lock Wallet
    When I tap on the Settings tab option
    And In settings I tap on the Lock Option
    Then device alert <alert_msg> is displayed
    When I tap Yes on alert
    Then Login screen is displayed
    Examples:
      | alert_msg                               |
      | Do you really want to lock your wallet? |

  Scenario: Reset Wallet
    When I tap Reset Wallet on Login screen
    And I tap I understand, continue on Delete wallet modal
    And I type "delete" on Delete wallet modal permanently
    And I tap Delete my wallet on Delete wallet modal permanently
    Then Wallet setup screen is displayed
