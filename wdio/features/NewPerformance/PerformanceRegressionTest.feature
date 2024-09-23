@androidApp
@iosApp
@performanceRegressionTest
Feature: Performance Regression Test
  This feature measures the Performance of the app when:
  The user installs the app for the very first time

  Scenario: Measure cold start launch time on fresh install: react-native-performance
    Given the app is launched
    When the Welcome screen is displayed
    Then the app start time should not exceed "500" milliseconds

  Scenario: Measure cold start launch time on fresh install
    Given the app is launched
    When the Welcome screen is displayed
    Then the app should launch within "4" seconds

