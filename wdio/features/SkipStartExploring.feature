@androidApp
Feature: Skip Start Exploring

  Scenario: A user should be able to tap the Skip button and the onboarding tutorial modal should disappear
    Given I have imported my wallet
    And the onboarding wizard is visible on wallet view
    When I tap on "Take a Tour" button
    Then the tutorial modal heading should read "Your Accounts"
    And there should be an explanation of the accounts functionality.
    And I should see the "Skip Tutorial" button
    When I tap on "Got it" button
    Then the tutorial modal heading should read "Edit Account Name"
    And there should be an explanation about adding a nickname to your account.
    And I should see the "Skip Tutorial" button
    When I tap on "Skip" button
    Then the onboarding wizard is no longer visible
    And the "Skip" button is no longer visible

