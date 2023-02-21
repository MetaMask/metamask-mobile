@androidApp @regression @ChainScenarios

Feature: Importing account via private then revoking permissions

    Scenario: Import wallet
        Given the app displayed the splash animation
        And I have imported my wallet
        And I tap No Thanks on the Enable security check screen
        And I tap No thanks on the onboarding welcome tutorial


    Scenario: User grants permission to a dapp to access one of their accounts
        When I navigate to the browser
        When I tap on button with text "Wallet"

#     And I navigate to "https://app.sushi.com/swap"
#     Then the connect modal should be displayed
#     And I connect my active wallet to the dapp


# Scenario Outline: From the connect accounts modal in the connect dapp flow, a user imports an account via private key
#     When I tap on browser control menu icon on the bottom right of the browser view
#     When I tap the "New Tab" option on the Option Menu
#     Then new browser tab is added
#     And I navigate to "https://metamask.github.io/test-dapp/"
#     And I trigger the connect modal
#     Then the connect modal should be displayed
#     When I tap on button with text "Connect multiple accounts"
#     And I tap on button with text "Import an account"
#     When I type <PRIVATEKEY> into the private key input field
#     And I tap on the private key import button
#     Then The account is imported
#     And I tap on button with text "Select all"
#     When I connect multiple accounts to a dapp
#     Then I should be connected to the dapp
#     # When I tap on the Network Icon
#     And I set "Account 2" as my primary account
#     Examples:
#         | PRIVATEKEY                                                       |
#         | cbfd798afcfd1fd8ecc48cbecb6dc7e876543395640b758a90e11d986e758ad1 |

# Scenario: Remove imported account
#     When I navigate to the wallet
#     And I tap on the Identicon
#     Then the account list should be visible
#     When I long press to remove "Account 2"


# Scenario: User revokes dapp permission
#     When I tap on the Network Icon
#     And I tap on button with text "Permissions"
#     # And I tap on button with text "connect multiple accounts"
#     And I tap on button with text "Revoke"
#     Then I should not be connected to the dapp
# Then the connected accounts modal should be visible
# And my active account is selected by default
# When I tap Connect
# Then I should see a toast message with my connected account
# When I tap “Revoke” button for my first account
# Then the dapp should no longer have access to my account