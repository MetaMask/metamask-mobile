@FIXTURES_SKIP_ONBOARDING
@androidApp
@performance
Feature: Measure Wallet Screen Warm Start
  # This feature measures the warm start of the app when:
  # The time it takes to get from login view to wallet view.

  Scenario: Measure Warm Start after Importing a Wallet
    When I fill my password in the Login screen
    And The timer starts running after I tap the login button
    Then The wallet view appears in "4" seconds
