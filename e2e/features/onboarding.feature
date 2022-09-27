@iosApp @androidApp
Feature: New app install setup on a mobile device
  Users can install MetaMask mobile app from the device app store.

  # Scenario: Fresh install of MetaMask mobile on device
  #   User downloads and installs MetaMask mobile app from the device
  #   app store for the first time.

  #   Given I have installed MetaMask mobile app on my device
  #   When I tap to open MetaMask mobile app
  #   Then MetaMask animated loading logo is displayed
  #   And "Welcome to MetaMask" screen is displayed after logo

  Scenario Outline: Onboarding
    This is the onboarding process after a new user installs the mobile app
    and launches the app for the first time.

    Given I just installed MetaMask on my <device>
    When I launch MetaMask mobile app
    Then "METAMASK" is displayed
    And "Welcome to MetaMask" carousel item is displayed
    When I swipe left on the carousel
    Then "Manage your digital assets" carousel item is displayed
    When I swipe left on the carousel
    Then "Your gateway to web3" carousel item is displayed
    When I swipe left on the carousel
    Then "Your gateway to web3" is displayed
    When I tap "Get started"
    Then "Wallet setup" is displayed
    And "Import an existing wallet or create a new one" is displayed
    And "Import using Secret Recovery Phrase" is displayed
    And "Create a new wallet" is displayed
    And "By proceeding, you agree to these Terms and Conditions." is displayed
    And "< Back" is displayed
    Examples:
      | device        | carousel | Header 3 |
      | iPhone 11 Pro | Value 2  | Value 3  |
