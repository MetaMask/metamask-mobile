@androidApp
@performance
Feature: App Cold Start Launch Times with fresh install
    # This feature measures the cold start of the app when:
    # The user installs the app for the very first time

    Scenario: Measure cold start launch time on fresh install
        Given the app is launched
        When the Welcome screen is displayed
        Then the app should launch within "1" seconds