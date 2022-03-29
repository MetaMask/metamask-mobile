Feature: New app install setup on a mobile device
    

    Scenario: Import Wallet
        MetaMask mobile users can import existing Ethereum supported 
        digital wallets. Users can choose to import existing wallet as
        one of the options for onboarding after installing MetaMask 
        mobile.

        Given I have installed MetaMask mobile app on my device
        And I am on the onboarding welcome screen
        When I tap "Get started"
        Then "Wallet setup" screen is displayed
        When I tap "Import using Secret Recovery Phrase"
        Then "Help make MetaMask better" screen is displayed
        When I tap "I Agree"
        Then "Import from seed" screen is displayed
        When I input "<SRP>" for Secret Recovery Phrase
        And I input "<metapass1>" for New Password
        And I input "<metapass1>" for Confirm password
        And I tap "Remember me"
        And I tap "Import"
        Then "Wallet view" screen is displayed
        And "Take a tour" is displayed
