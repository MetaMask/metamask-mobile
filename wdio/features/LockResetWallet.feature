@iosApp
@androidApp
@ChainScenarios
Feature: Lock and Reset Wallet

  Scenario: Import wallet
    Given I have imported my wallet
    And I tap No Thanks on the Enable security check screen
    And I tap No thanks on the onboarding welcome tutorial

  Scenario: Change Password
    When I tap "No, Thanks"
    And I tap burger icon
    And I tap on "Settings" in the menu
    And In settings I tap on "Security & Privacy"
    And on Security & Privacy screen I tap "Change password" 
    And on Change password screen I input "password" in confirm field
    And on Change password screen I tap CONFIRM
    Then "Incorrect password" is visible
    When on Change password screen I input "12345678" in confirm field
    And on Change password screen I tap CONFIRM
    When I input a new password "1234554321"
    And on Reset password screen I input "1234554321" in confirm field
    And I tap Reset password
    Then Creating your password is displayed

  Scenario: Lock Wallet
    When I navigate to Lock Wallet from Security & Privacy
    And I tap burger icon
    And I tap Lock menu item
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
    Then "Wallet setup" is displayed
