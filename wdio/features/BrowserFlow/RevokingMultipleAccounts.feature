@androidApp @regression @ChainScenarios

Feature: Importing account via private then revoking permissions

    Scenario: Import wallet
        Given the app displayed the splash animation
        And I have imported my wallet
        And I tap No Thanks on the Enable security check screen
        And I tap No thanks on the onboarding welcome tutorial


    Scenario: User grants permission to a sushiswap to access one of their accounts
        When I navigate to the browser
        # When I tap on button with text "Wallet"

        And I navigate to "https://app.sushi.com/swap"
        Then the connect modal should be displayed
        And I connect my active wallet to the dapp


    Scenario: A user opens another dapp in a new browser tab
        When I tap on browser control menu icon on the bottom right of the browser view
        When I tap the "New Tab" option on the Option Menu
        Then new browser tab is added
        And I navigate to "https://metamask.github.io/test-dapp/"

    Scenario: From the connect accounts modal, a user creates another account

        And I trigger the connect modal
        Then the connect modal should be displayed
        When I tap on button with text "Connect multiple accounts"
        And I tap on button with text "Create a new account"
        Then "Account 2" is not displayed
        And I tap on button with text "Select all"
        When I connect multiple accounts to a dapp
        Then I should be connected to the dapp


    Scenario: Revoke all permissions on the test dapp
        When I tap on the Network Icon
        And I tap on button with text "Permissions"
        And I tap on button with text "Revoke all"
        Then I should not be connected to the dapp

    Scenario: User switches back to sushiswap and verifies that account 1 is still connected

        When I tap on the tab button
        And I tap on browser tab with text "app.sushi.com"
        Then I should be connected to the dapp
        And "Account 2" is not displayed
        And "Account 1" is visible
