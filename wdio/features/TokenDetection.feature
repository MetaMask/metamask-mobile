Feature: Token Detection
    https://www.figma.com/file/2h15YfvbT2q4q1FOMJFPP1/Token-Detection-V2?node-id=12%3A3663

    Scenario: What's New updated content
        New content has been added to the Welcome carousel describing
        Enhanced Token Detection.
        Given I have MetaMask Mobile build "900" open on my device
        And this is the first time I am launching this build
        When I launch MetaMask mobile app
        Then "See what's new" carousel screen is displayed
        And Enhanced Token Detection information is displayed on carousel
        When I tap "View Settings"
        Then Settings > Advanced is displayed
        And Enhanced Token Detection is enabled

    Scenario Outline: Enhanced Token Detection UI Settings
        Enabling Enhanced Token Detection will only impact token detection
        on the account level in the wallet view.
        Given I have MetaMask Mobile build "900" open on my device
        And I am on <chain> network
        And I am on Settings
        When I tap Advanced
        And I swipe up to scroll down
        Then Enhanced Token Detection is displayed
        And Enhanced Token Detection is enabled
        When I tap back
        Then I am on Settings view
        When I tap Experimental
        Then Enhanced Token Detection is not displayed
        When I navigate to Wallet view
        Then link with a count of detected tokens on network is displayed below token list
        When I navigate to Settings > Advanced
        And I tap to disable Enhanced Token Detection
        And I navigate back to Wallet view
        Then link with a count of detected tokens on network is not displayed
        Examples:
            | chain    |
            | Ethereum |
            | Polygon  |
            | Binance  |
            | Avalance |

    Scenario: Import Wallet with token balances from multiple networks
        Examples:
            | wallet  | type      | nft     |
            | address | extension | address |
            | address | mobile    | address |
            | address | keystone  |         |

    Scenario: Create New Wallet
    Send funds to this wallet and funds should be detected after received.


    @regression
    Scenario Outline: Autocomplete for Swaps
        Enhanced Token Detection setting no longer impacts token search on a network.
        Token search autocomplete will always pull from dynamic token list for
        supported networks. Token search autocomplete will no longer pull from
        static token list.
        Given I have MetaMask Mobile build "900" open on my device
        And I have Enhanced Token Detection <setting>
        And I am on <chain> network
        And I am on Swaps view
        Then network native token <nativetoken> is default selected for swap from dropdown
        When I tap "Select a token" in convert token to dropdown
        Then "Convert to" asset search view is displayed
        And default search results with popular assets are displayed for <chain> network
        When I swipe up on search results
        Then search results scrolls to the bottom of results
        And "Can't find a token" toast view is displayed at the bottom of results
        When I tap keyboard space key for input " " in asset search field
        Then search results are not reqested
        And search results are not updated
        When I input ":()$" in asset search field
        Then "No tokens match ':()$'" is displayed
        And search results do not show any assets
        When I tap clear icon in search field
        Then text is cleared from search field
        And search result is updated to display default assests for <chain> network
        When I input <text> in asset search field
        Then Enhanced Token Detection <switch> search results for <text> is displayed
        And <token> is displayed in the search results
        And proper token icons for assests in search results are displayed
        And assets in search results contain <text>
        When I tap <token>
        Then <token> is displayed in convert token to dropdown
        And toast message "Verified on {count} sources. Always verify the token address on {blockexplorer}." is displayed
        But toast message will be displayed as a warning if verified source <count> is less than 2
        When I continue with Swap flow
        Then Swap transaction is successful
        Examples:
            | devices              | setting  | chain    | nativetoken | text | token | count | blockexplorer | device_theme |
            | Physical iOS 15.5    | enabled  | Ethereum | ETH         | aav  | AAVE  | 6     | Etherscan     | dark         |
            | Simulator Android 9  | enabled  | Ethereum | ETH         | lqt  | LQTY  |       | Etherscan     | light        |
            | Simulator iOS 15.0   | disabled | Ethereum | ETH         | ape  | APE   |       | Etherscan     | dark         |
            | Physical Android 12  | enabled  | Binance  | BNB         | shi  | SHIB  | 1     |               | light        |
            | Simulator iOS 15.2   | enabled  | Binance  | BNB         | bsc  | BSC   |       |               | dark         |
            | Simulator iOS 15.2   | disabled | Binance  | BNB         | dai  |       |       |               | light        |
            | Simulator Android 10 | enabled  | Polygon  | MATIC       | poly | MATIC |       | Polygonscan   | dark         |
            | Simulator Android 11 | enabled  | Polygon  | MATIC       | xyz  |       |       | Polygonscan   | light        |
            | Physical iOS 15.5    | disabled | Polygon  | MATIC       | dai  |       |       | Polygonscan   | dark         |
            | Simulator iOS 15.4   | enabled  | Avalance | AVAX        | ava  | AVAX  |       |               | light        |
            | Simulator Android 11 | enabled  | Avalance | AVAX        | xyz  |       |       |               | dark         |
            | Physical Android 12  | disabled | Avalance | AVAX        | dai  |       |       |               | light        |
            | Physical Android 12  | disabled | Rinkeby  | ETH         | dai  |       |       |               | light        |

    @regression
    Scenario: Autocomplete for Request tokens
        Enhanced Token Detection setting no longer impacts token search on a network.
        Token search autocomplete will always pull from dynamic token list for
        supported networks. Token search autocomplete will no longer pull from
        static token list.
        Given I have MetaMask Mobile build "900" open on my device
        And I have Enhanced Token Detection <setting>
        And I am on <chain> network
        And I am on Request view
        Then "Top picks" assets are displayed for <chain> network
        And "Your tokens" assets are displayed for <chain> network
        When I tap keyboard space key for input " " in asset search field
        Then search results are not reqested
        And search results are not updated
        When I input ":()$" in asset search field
        Then "No tokens found" is displayed
        And search results do not show any assets
        But "Your tokens" is displayed below search results
        When I tap clear icon in search field
        Then text is cleared from search field
        And search result is updated to display default assests for <chain> network
        When I input <text> in asset search field
        Then Search results displays <token> asset at the top
        And assets in search results contain <text>
        When I tap <token>
        Then "Enter amount" is displayed
        And input field for numbers is displayed
        And <token> is displayed at end of input field
        But fiat currency symbol is displayed at beginning of input field if Fiat is selected in Settings > Primary Currency
        When I enter <amount> in amount field
        And I tap "Reset"
        Then amount field is cleared
        When I enter <amount> in amount field
        And I tap "Next"
        Then "Send Link" view is displayed
        When I continue with Request flow
        Then Request transaction is successful
        Examples:
            | devices              | setting  | chain    | text | token | amount   |
            | Physical iOS 15.5    | enabled  | Ethereum | aav  | AAVE  | 25.01    |
            | Simulator Android 9  | enabled  | Ethereum | lqt  | LQTY  | 101      |
            | Simulator iOS 15.0   | disabled | Ethereum | ape  | APE   | 13.01258 |
            | Physical Android 12  | enabled  | Binance  | shi  | SHIB  | 0.001    |
            | Simulator iOS 15.2   | enabled  | Binance  | bsc  | BSC   | 1        |
            | Simulator iOS 15.2   | disabled | Binance  | dai  |       | 12       |
            | Simulator Android 10 | enabled  | Polygon  | poly | MATIC | 88       |
            | Simulator Android 11 | enabled  | Polygon  | xyz  |       | 56       |
            | Physical iOS 15.5    | disabled | Polygon  | dai  |       | 33       |
            | Simulator iOS 15.4   | enabled  | Avalance | ava  | AVAX  | 12.0054  |
            | Simulator Android 11 | enabled  | Avalance | xyz  |       | .1155    |
            | Physical Android 12  | disabled | Avalance | dai  |       | 10.01    |

    @regression
    Scenario: Autocomplete for Import Tokens
        Enhanced Token Detection setting no longer impacts token search on a network.
        Token search autocomplete will always pull from dynamic token list for
        supported networks. Token search autocomplete will no longer pull from
        static token list for supported networks.
        Given I have MetaMask Mobile build "900" open on my device
        And I have Enhanced Token Detection <setting>
        And I am on <chain> network
        And I am on Wallet view
        When I tap "Import Tokens"
        Then Import tokens view is displayed
        And I am on the Search tab
        But "Token detection is currently available on {chain} network." is display if <setting> is disabled
        And I can tap "Enable it from Settings." if <setting> is disabled
        But "Token detection is not available on this network yet." is displayed if <chain> is not supported for token autocomplete
        And I can tap "token scams and security risk." if <chain> is not supported for token autocomplete
        When I tap keyboard space key for input " " in asset search field
        Then search results are not reqested
        And search results are not updated
        When I input ":()$" in asset search field
        Then "We couldn't find any tokens with that name." is displayed
        And search results do not show any assets
        When I input <text>
        Then <token> is displayed at the top of Select Token search results
        And assets in search results contain <text>
        When I tap <token>
        Then <token> asset displays as selected
        And Import button is enabled
        When I swipe up on asset search results
        And I tap Import button
        Then Wallet view is displayed
        And <token> is displayed at the bottom of the TOKENS tab
        And <token> balance is <balance>
        When I tap <token>
        Then <token> details view is display
        And "You have no transactions!" is displayed
        Examples:
            | devices              | setting  | chain    | text | token | balance |
            | Physical iOS 15.5    | enabled  | Ethereum | aav  | AAVE  | 0       |
            | Simulator Android 9  | enabled  | Ethereum | lqt  | LQTY  | 0       |
            | Simulator iOS 15.0   | disabled | Ethereum | ape  | APE   | 0       |
            | Simulator iOS 15.0   | enabled  | Rinkeby  | eth  | ETH   | 0       |
            | Physical Android 12  | enabled  | Binance  | shi  | SHIB  | 0.001   |
            | Simulator iOS 15.2   | enabled  | Binance  | bsc  | BSC   | 1       |
            | Simulator iOS 15.2   | disabled | Binance  | dai  |       | 12      |
            | Simulator Android 10 | enabled  | Polygon  | poly | MATIC | 88      |
            | Simulator Android 11 | enabled  | Polygon  | xyz  |       | 56      |
            | Physical iOS 15.5    | disabled | Polygon  | dai  |       | 33      |
            | Simulator iOS 15.4   | enabled  | Avalance | ava  | AVAX  | 12.0054 |
            | Simulator Android 11 | enabled  | Avalance | xyz  |       | .1155   |
            | Physical Android 12  | disabled | Avalance | dai  |       | 10.01   |


    Scenario: Account Token Detection
        Account token detection shown on wallet view with a count
        of new tokens detected and link to new tokens found list view.
        Given I have MetaMask Mobile build "900" open on my device
        And I have Enhanced Token Detection enabled
        And I am on <chain> network
        And I am on Wallet view
        And I am on "Account 1" account
        When I tap "{count} new tokens found in this account"
        Then "{count} tokens found" view is displayed
        And <detected_token_count> tokens are listed
        And token balance is displayed for each found token
        And fiat balance is displayed for each found token
        And I can tap token address to copy for each found token
        And "From token list:" displays up to two list for each token
        And I can tap "+{count} more" for each found token that has more than two token list
        And each found token is selected for import
        When I tap "Ignore all"
        Then "Are you sure?" alert message is displayed
        When I tap "Cancel"
        Then "{count} new tokens found" view is displayed
        When I tap "Ignore all"
        And I tap "Confirm" in "Are you sure?" alert message
        Then Wallet view is displayed
        And tokens found link is not displayed
        And token list does not show any new tokens imported
        When I switch to "Account 2"
        Then Wallet view is displayed for "Account 2"
        And "{count} new tokens found in this account" is displayed
        When I tap "{count} new tokens found in this account"
        Then "{count} new tokens found" view is displayed
        When I unselect <no_import> token
        And I tap "Import"
        And I tap "Confirm" in "Are you sure?" alert message
        Then "Token imported" alert message is displayed
        And "Token imported" alert message displays tokens selected for import
        And "Token imported" alert message does not display tokens unselected for import
        And Wallet view is displayed for "Account 2"
        When I swap new imported tokens
        Then swap transaction is successful
        When I send new import tokens
        Then send transaction is successful
        Examples:
            | chain    | detected_token_count | no_import |
            | Ethereum | 6                    | DAI       |
            | Polygon  | 3                    | USDT      |
            | Binance  | 2                    | USCD      |
            | Avalance | 2                    | UST       |
            | Rinkeby  | 3                    | APE       |

    Scenario: Token Details
        Additional information for a non-native token is displayed. Hide Token
        is available in Token details view.
        Given I have MetaMask Mobile build "900" open on my device
        And I am on <chain> network
        And I am on Token view for <token>
        When I tap options icon
        Then "View on block explorer" is displayed
        And I can tap "View on block explorer"
        But "Token details" is displayed if <token> is not <native_token>
        When I tap "Token details"
        Then "Token details" view is displayed
        And token balance is displayed
        And token fiat balance is displayed
        And "Token contract address" is displayed
        And I can tap token contract address to copy
        And "Token decimal" is displayed
        And "Network" is displayed
        And <chain> is displayed as the network
        And "Token list:" is displayed
        And "Hide tokens" is displayed
        When I tap "Hide tokens"
        Then "Hide tokens?" alert is displayed
        And "You can add this token back in the future by going to “Import token” and searching for the token." alert message is displayed
        When I tap "Cancel"
        Then "Tokens details" view is displayed for <token>
        When I tap "Hide tokens"
        And I tap "Hide"
        Then Wallet view is displayed
        And <token> is not displayed
        Examples:
            | chain    | native_token | token | language |
            | Ethereum | ETH          | DAI   |          |
            | Ethereum | ETH          | ETH   |          |
            | Polygon  | MATIC        | USDT  |          |
            | Polygon  | MATIC        | MATIC |          |
            | Binance  | BNB          | USCD  |          |
            | Binance  | BNB          | BNB   |          |
            | Avalance | AVAX         | UST   |          |
            | Avalance | AVAX         | AVAX  |          |
            | Rinkeby  | ETH          | ETH   |          |

    Scenario: Hide Tokens replacing existing Remove Tokens
        Press and hold on a token in the Wallet view token list will
        now say "Hide" instead of "Remove" on device message button.
        Given I have MetaMask Mobile build "900" open on my device
        And I am on <chain> network
        And I am on Wallet view
        When I tap and hold on a <token> in the token list
        Then device toast message is displayed
        And "Do yo want to hide token?" is displayed in toast message
        When I tap "Cancel" toast message button
        Then Wallet view is displayed
        And <token> is displayed in Wallet view
        When I tap and hold on a <token> in the token list
        And I tap "Hide" toast message button
        Then Wallet view is displayed
        And <token> is not displayed
        When I close MetaMask mobile app
        And I relaunch MetaMask mobile app
        And I navigate to Wallet view
        Then <token> is not displayed
        Examples:
            | chain    | token |
            | Ethereum | ETH   |
            | Polygon  | MATIC |
            | Binance  | BNB   |
            | Avalance | AVAX  |


    Scenario: Token Import Analytics
        Importing tokens will now be captured with analytics.
        Given I have MetaMask Mobile build "900" open on my device
        And I have Participate in MetaMetics enabled
        And I am on Wallet view
        When I import a token
        Then mixpanel analytics shows that a token has been imported on my device
        When I have Participate in MetaMetics disabled
        Then mixpanel analytics does not show that a token has been imported on my device

    Scenario: Token Detection Translations

    @regression
    Scenario Outline: Regression Devices
        Examples:
            | devices                          | purpose                     |
            | Browserstack Samsung Android 9   | older device support        |
            | Browserstack Samsung Android 12  | split screen device support |
            | Browserstack Google Android 10   | older device support        |
            | Browserstack Motorola Android 10 | small display support       |
            | iOS 14.4                         | older device support        |
            | iPad iOS                         | tablet support              |
            | iOS 14.4                         | small display support       |
