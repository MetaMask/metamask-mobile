@androidApp @regression
Feature: This feature deletes the wallet from the Security and Privacy View

  Background: Import wallet
    Given the app displayed the splash animation
    And I have imported my wallet
    And I tap No Thanks on the Enable security check screen
    And I tap No thanks on the onboarding welcome tutorial

  Scenario: Delete wallet from Settings
    When I tap burger icon
    And I tap on "Settings" in the menu
    And In settings I tap on "Security & Privacy"
    Then Security & Privacy screen is displayed
    And I tap on the Delete Wallet button
    And I tap I understand, continue on Delete wallet modal
    And I type "delete" on Delete wallet modal permanently
    And I tap Delete my wallet on Delete wallet modal permanently
    Then "Wallet setup" is displayed
