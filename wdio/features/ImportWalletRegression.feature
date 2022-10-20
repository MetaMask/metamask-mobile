@iosApp @androidApp
Feature: Import Wallet Regression
    Users can use the app to import an existing wallet or create a new one.

    Scenario: Import wallet using SRP
        Given I just installed MetaMask on my device
        When I launch MetaMask mobile app
        Then "METAMASK" is displayed
        When I tap "Get started"
        Then "Wallet setup" is displayed
        When I tap "Import using Secret Recovery Phrase"
        Then "Help us improve MetaMask" is displayed
        When I tap "I agree"
        Then "Import from seed" is displayed

    Scenario Outline: Invalid SRP
        When I type <invalid_SRP> in SRP field
        And I type <password> in new password field
        And I type <password> in confirm password field
        And I tap "Import"
        Then device alert <error> is displayed
        Examples:
            | invalid_SRP                                                              | password  | error                          |
            | fold media south not valid secret recovery phrase pause cloth just raven | metapass1 | Invalid Secret Recovery Phrase |

    Scenario Outline: Password Strength
        When I retype <password> in new password field
        Then password strength <strength> is displayed
        Examples:
            | password  | strength                |
            | metapass1 | Password strength: Weak |
    # | Metapass12345   | Password strength: Good   |
    # | Metapass12345!@ | Password strength: Strong |

    Scenario: Import Wallet
        When I type <SRP> in SRP field
        And I tap "Import"
        Then "Welcome to your new wallet!" is displayed
        Examples:
            | SRP                                                                   | password  |
            | fold media south add since false relax immense pause cloth just raven | metapass1 |
