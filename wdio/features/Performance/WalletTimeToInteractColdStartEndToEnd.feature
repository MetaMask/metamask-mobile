@androidApp
@iosApp
# @performance
Feature: App Cold Start Launch Times From End to End
    This task measures the app launch time as soon as the app is relaunched up until the user logs into the wallet

    Scenario: Measure cold start launch time after importing a wallet
        Given the splash animation disappears
        And I have imported my wallet
        And I tap No Thanks on the Enable security check screen
        And I close all the onboarding modals
        And I am on the wallet view
        When I kill the app
        And I relaunch the app
        And the timer starts running
        And I fill my password in the Login screen
        And I log into my wallet
        Then the app should launch within "14" seconds