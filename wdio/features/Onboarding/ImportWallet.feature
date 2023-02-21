@iosApp
@androidApp 
@smoke

Feature: Import Wallet
  Users  can use the app to import an existing wallet or create a new one.

  Scenario Outline: Import Wallet - Manual input SR
    After a user completes the onboarding process then they are presented
    with the option to create a new wallet and back it up.

    Given I just installed MetaMask on my device

    When I launch MetaMask mobile app
    Then "METAMASK" is displayed

    When I tap "Get started"
    Then "Wallet setup" is displayed

    When I tap "Import using Secret Recovery Phrase"
    Then "Help us improve MetaMask" is displayed

    When I tap "I agree"
    Then "Import from seed" is displayed

    When I type <SRP> in SRP field
    And I type <password> in new password field
    And I type <password> in confirm password field
    And I tap "Import"
    And I tap No Thanks on the Enable security check screen
    Then "Welcome to your new wallet!" is displayed

    Examples:
      | SRP                                                                   | password  |
      | fold media south add since false relax immense pause cloth just raven | metapass1 |
