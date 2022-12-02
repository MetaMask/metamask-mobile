@iosApp @androidApp
Feature: Lock and Reset Wallet

    Scenario: Import wallet
        Given I just installed MetaMask on my device
        When I launch MetaMask mobile app
        And I tap "Get started"
        And I tap "Import using Secret Recovery Phrase"
        And I tap "I agree"
        And I type <SRP> in SRP field
        And I type <password> in new password field
        And I type <password> in confirm password field
        And I tap "Import"
        And I tap No Thanks on the Enable security check screen
        Then "Welcome to your new wallet!" is displayed
        Examples:
            | SRP                                                                   | password      |
            | fold media south add since false relax immense pause cloth just raven | Metapass12345 |

    Scenario: Lock Wallet
        When I tap "No, Thanks"
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