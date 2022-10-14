 @iosApp @androidApp
Feature: New wallet flow
  
 Scenario: Onboarding New walllet
    A user opens the app for first time and creates a new wallet.

    Given I just installed MetaMask on my device
    When I tap "Get started"
    Then "Wallet setup" is displayed
    When On Wallet Setup Screen I tap "Create a new wallet"
    And On Wallet Setup Screen I tap "Agree"
    And I input a new password and create account
    Then I select remind me later on secure wallet screen and proceed to accountP