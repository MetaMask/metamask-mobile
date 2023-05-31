@androidApp
@smoke
@onboarding
Feature: Onboarding Carousel
  Users can install MetaMask mobile app from the device app store and read the onboarding carousel

  Scenario: New app install setup on a mobile device
    This is the onboarding process after a new user installs the mobile app
    and launches the app for the first time.
    Given the app displayed the splash animation
    And the splash animation disappears
    And the Welcome Screen is displayed
    When I swipe left on the carousel
    Then "Manage your digital assets" carousel item is displayed
    When I swipe left on the carousel
    Then "Your gateway to web3" carousel item is displayed
    When I swipe left on the carousel
    And I tap "Get started"
    Then Wallet setup screen is displayed

