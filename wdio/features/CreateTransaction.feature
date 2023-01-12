@androidApp
Feature: Create Transaction
  This is meant to be an example for testing transaction data

  Scenario: Create transaction on test net
    Given I import wallet using seed phrase "fold media south add since false relax immense pause cloth just raven"
    And I tap No Thanks on the Enable security check screen
    And I tap No thanks on the onboarding welcome tutorial
    Then I tap on the Send button
