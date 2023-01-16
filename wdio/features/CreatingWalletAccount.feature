@androidApp @ChainScenarios

Feature: Creating account in wallet
    Scenario: Import account
        Given I have imported my wallet
        # Given I have created my wallet
        And I tap No Thanks on the Enable security check screen
        And I tap No thanks on the onboarding welcome tutorial

     Scenario: Creating a new wallet account
        Given I am on the wallet view
        When I tap on the Identicon
        Then the account list should be visible
        When I tap on button with text "Create a new account"
        Then Account named "Account 2" is created
        And I tap on button with text "Account 2"
        Then the account name on main wallet screen should now read "Account 2"
