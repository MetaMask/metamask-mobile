@iosApp
@performance
Feature: Measure Fresh Install Cold Start
  This feature measures the cold start of the app when:
  The user installs the app for the very first time

  Scenario: Wallet Time To Interact Cold Start on Fresh Install
    Given the app is launched
    Then Wallet setup screen is displayed
    Then the app start time should not exceed "700" milliseconds
