@androidApp 
@ChainScenarios 
@smoke

Feature: New wallet flow

  Scenario: Onboarding New walllet
    A user opens the app for first time and creates a new wallet.

    Given I just installed MetaMask on my device

    When I launch MetaMask mobile app
    Then "METAMASK" is displayed

    When I tap "Get started"
    Then "Wallet setup" is displayed

    When On Wallet Setup Screen I tap "Create a new wallet"
    And On Wallet Setup Screen I tap "Agree"
    Then I am presented with a new Account screen with password fields
    And I input a new password "1234554321"
    And I confirm the new password "1234554321"
    And secure wallet page is presented
    Then I select remind me later on secure wallet screen
    And Select "Skip" on remind secure modal
    Then I should proceed to the new wallet
