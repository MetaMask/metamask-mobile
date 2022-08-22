@install @e2e
Feature: New app install setup on a mobile device
    Users can install MetaMask mobile app from the device app store.

    Scenario: Fresh install of MetaMask mobile on device
        User downloads and installs MetaMask mobile app from the device
        app store for the first time.

        Given I have installed MetaMask mobile app on my device
        When I tap to open MetaMask mobile app
        Then MetaMask animated loading logo is displayed
        And "Welcome to MetaMask" screen is displayed after logo


@install @e2e
Feature: Custom RPC Tests

    Scenario: should create new wallet
        Given I create a wallet

    Scenario: should create new wallet
        Given I create a wallet