@androidApp
@regression
Feature: Skip Create New Wallet

  Scenario: Skip Onboarding New wallet
    User opens the app for first time and creates a new wallet.
    Given Fixture server is started and state is loaded
    Then Load fixures into state
    Then The server should be started
    When I kill the app
    Then I relaunch the app
    And I log into my wallet
    Then Fixture server is stopped
