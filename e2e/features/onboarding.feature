@iosApp @androidApp
Feature: Onboarding
  Users can install MetaMask mobile app from the device app store.
  Therefor, they can use the app to import an existing wallet or create a new one.

  @skip()
  Scenario: New app install setup on a mobile device
    This is the onboarding process after a new user installs the mobile app
    and launches the app for the first time.

    Given I just installed MetaMask on my device
    When I launch MetaMask mobile app
    Then "METAMASK" is displayed
    And "Welcome to MetaMask" carousel item is displayed
    When I swipe left on the carousel
    Then "Manage your digital assets" carousel item is displayed
    When I swipe left on the carousel
    Then "Your gateway to web3" carousel item is displayed
    When I swipe left on the carousel
    When I tap "Get started"
    Then "Wallet setup" is displayed
    And "Import an existing wallet or create a new one" is displayed
    And "Import using Secret Recovery Phrase" is displayed
    And "Create a new wallet" is displayed
    And "By proceeding, you agree to these Terms and Conditions." is displayed

  Scenario: Import Wallet - Manual input SR
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
    When I type my "Secret Recovery Phrase"
    And I type my "New password"
    And I type my "Confirm password"
