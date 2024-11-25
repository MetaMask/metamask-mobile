@androidApp
@performance
Feature: Measure Login Screen Cold Start
    # This feature measures the cold start of the app when:
    # The user imports a wallet and the time it takes to get from launching app to login view

    Scenario: Cold Start on Login Screen After Importing a Wallet
        Given I have imported my wallet
        And I tap No Thanks on the Enable security check screen
        And I close all the onboarding modals
        And I am on the wallet screen
        When I kill the app
        And I relaunch the app
        And the timer starts running
        Then The Login screen should be visible in "4" seconds