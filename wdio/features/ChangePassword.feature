@iosApp
@androidApp
@ChainScenarios
@regression
Feature: Change password

    Scenario: Import wallet
        Given the app displayed the splash animation
        And I have imported my wallet
        And I tap No Thanks on the Enable security check screen
        And I tap No thanks on the onboarding welcome tutorial

    Scenario: Navigate to Change Password in Settings
        When I tap burger icon
        And I tap on "Settings" in the menu
        And In settings I tap on "Security & Privacy"
        Then on Security & Privacy screen I tap "Change password"

    Scenario: Invalid password
        When on Change password screen I input "123456789" in confirm field
        And on Change password screen I tap CONFIRM
        Then "Incorrect password" is visible

    Scenario: Change password
        When on Change password screen I input "12345678" in confirm field
        And on Change password screen I tap CONFIRM
        When I input a new password "1234554321"
        And on Reset password screen I input "1234554321" in confirm field
        And I tap Reset password
        Then Creating password is displayed
        And I navigate to Wallet view from Security & Privacy

    Scenario Outline: Unlock with new password
        When I kill then app
        And I relaunch the app
        And I unlock wallet with <password>
        Then Wallet view is displayed
        Examples:
            | password   |
            | 1234554321 |
