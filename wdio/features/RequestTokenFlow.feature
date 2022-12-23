@androidApp
Feature: Request Token
    This feature goes through the request token flow

    Scenario: Import account and navigate to Request
        Given I import wallet using seed phrase "fold media south add since false relax immense pause cloth just raven"
        And I tap No Thanks on the Enable security check screen
        And I tap No thanks on the onboarding welcome tutorial
        And On the Main Wallet view I tap "Receive"

    Scenario: Request native token
        Given Text "Scan address to receive payment" is displayed on Q-R code view
        When I tap on button with text "Request Payment"
        # Then the Request view should appear
        And I tap on button with text "ETH"
        And I type "3" into the Request Amount field
        When I tap button "Reset" on Request Amount view
        Then Text "3" is not displayed on Request Amount view
        When I type "12" into the Request Amount field
        And I tap button "Next" to navigate to Send view
        Then Text "Your request link is ready to send!" is displayed on Send Link view
        And I tap on the close payment request icon

    Scenario: User requests ERC-20 token
        Given On the Main Wallet view I tap "Receive"
        And Text "Scan address to receive payment" is displayed on Q-R code view
        And I tap button "Request Payment" to navigate to Request view
        When I type "Link" in the Search Assets field
        Then Button "ChainLink Token" is displayed on Request Search view
        And I tap button "ChainLink Token" on Search Results view
        Then Text "LINK" is displayed on Request Amount view
        When I type "5" into the Request Amount field
        And I tap button "Next" to navigate to Send view
        Then Text "Your request link is ready to send!" is displayed on Send Link view
        And I tap button "QR Code" on Search Results view
        Then Text "Payment Request QR Code" is displayed on QR Code view
        








