package com.metamask.ui.base

object Fixtures {
  val DEFAULT_FIXTURES_JSON = """
    {
      "state": {
        "legalNotices": {
          "newPrivacyPolicyToastClickedOrClosed": true,
          "newPrivacyPolicyToastShownDate": 1684232000456
        },
        "collectibles": {
          "favorites": {}
        },
        "engine": {
          "backgroundState": {
            "AccountTrackerController": {
              "accountsByChainId": {
                "64": {
                  "0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3": {
                    "balance": "0x0"
                  }
                },
                "1": {
                  "0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3": {
                    "balance": "0x0"
                  }
                }
              }
            },
            "AddressBookController": {
              "addressBook": {}
            },
            "NftController": {
              "allNftContracts": {},
              "allNfts": {},
              "ignoredNfts": []
            },
            "TokenListController": {
              "tokensChainsCache": {
                "0x1": {
                  "data": [
                    {
                      "0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f": {
                        "address": "0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f",
                        "symbol": "SNX",
                        "decimals": 18,
                        "name": "Synthetix Network Token",
                        "iconUrl": "https://static.cx.metamask.io/api/v1/tokenIcons/1/0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f.png",
                        "type": "erc20",
                        "aggregators": [
                          "Aave",
                          "Bancor",
                          "CMC",
                          "Crypto.com",
                          "CoinGecko",
                          "1inch",
                          "PMM",
                          "Synthetix",
                          "Zerion",
                          "Lifi"
                        ],
                        "occurrences": 10,
                        "fees": {
                          "0x5fd79d46eba7f351fe49bff9e87cdea6c821ef9f": 0,
                          "0xda4ef8520b1a57d7d63f1e249606d1a459698876": 0
                        }
                      }
                    }
                  ]
                }
              },
              "preventPollingOnNetworkRestart": false
            },
            "CurrencyRateController": {
              "currentCurrency": "usd",
              "currencyRates": {
                "ETH": {
                  "conversionDate": 1684232383.997,
                  "conversionRate": 1815.41,
                  "usdConversionRate": 1815.41
                }
              }
            },
            "KeyringController": {
              "vault": "{\"cipher\":\"T+MXWPPwXOh8RLxpryUuoFCObwXqNQdwak7FafAoVeXOehhpuuUDbjWiHkeVs9slsy/uzG8z+4Va+qyz4dlRnd/Gvc/2RbHTAb/LG1ECk1rvLZW23JPGkBBVAu36FNGCTtT+xrF4gRzXPfIBVAAgg40YuLJWkcfVty6vGcHr3R3/9gpsqs3etrF5tF4tHYWPEhzhhx6HN6Tr4ts3G9sqgyEhyxTLCboAYWp4lsq2iTEl1vQ6T/UyBRNhfDj8RyQMF6hwkJ0TIq2V+aAYkr5NJguBBSi0YKPFI/SGLrin9/+d66gcOSFhIH0GhUbez3Yf54852mMtvOH8Vj7JZc664ukOvEdJIpvCw1CbtA9TItyVApkjQypLtE+IdV3sT5sy+v0mK7Xc054p6+YGiV8kTiTG5CdlI4HkKvCOlP9axwXP0aRwc4ffsvp5fKbnAVMf9+otqmOmlA5nCKdx4FOefTkr/jjhMlTGV8qUAJ2c6Soi5X02fMcrhAfdUtFxtUqHovOh3KzOe25XhjxZ6KCuix8OZZiGtbNDu3xJezPc3vzkTFwF75ubYozLDvw8HzwI+D5Ifn0S3q4/hiequ6NGiR3Dd0BIhWODSvFzbaD7BKdbgXhbJ9+3FXFF9Xkp74msFp6o7nLsx02ywv/pmUNqQhwtVBfoYhcFwqZZQlOPKcH8otguhSvZ7dPgt7VtUuf8gR23eAV4ffVsYK0Hll+5n0nZztpLX4jyFZiV/kSaBp+D2NZM2dnQbsWULKOkjo/1EpNBIjlzjXRBg5Ui3GgT3JXUDx/2GmJXceacrbMcos3HC2yfxwUTXC+yda4IrBx/81eYb7sIjEVNxDuoBxNdRLKoxwmAJztxoQLF3gRexS45QKoFZZ0kuQ9MqLyY6HDK\",\"iv\":\"3271713c2b35a7c246a2a9b263365c3d\",\"keyMetadata\":{\"algorithm\":\"PBKDF2\",\"params\":{\"iterations\":5000}},\"lib\":\"original\",\"salt\":\"l4e+sn/jdsaofDWIB/cuGQ==\"}",
              "keyrings": [
                {
                  "accounts": ["0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3"],
                  "type": "HD Key Tree"
                },
                {
                  "type": "QR Hardware Wallet Device",
                  "accounts": []
                }
              ]
            },
            "NetworkController": {
              "selectedNetworkClientId": "mainnet",
              "networksMetadata": {
                "mainnet": {
                  "status": "available",
                  "EIPS": {
                    "1559": true
                  }
                },
                "networkId1": {
                  "status": "available",
                  "EIPS": {
                    "1559": true
                  }
                }
              },
              "networkConfigurationsByChainId": {
                "0x1": {
                  "chainId": "0x1",
                  "rpcEndpoints": [
                    {
                      "networkClientId": "mainnet",
                      "url": "https://mainnet.infura.io/v3/{infuraProjectId}",
                      "type": "infura",
                      "name": "Ethereum Network default RPC"
                    }
                  ],
                  "defaultRpcEndpointIndex": 0,
                  "blockExplorerUrls": ["https://etherscan.io"],
                  "defaultBlockExplorerUrlIndex": 0,
                  "name": "Ethereum Main Network",
                  "nativeCurrency": "ETH"
                },
                "0x539": {
                  "chainId": "0x539",
                  "rpcEndpoints": [
                    {
                      "networkClientId": "networkId1",
                      "url": "http://localhost:8545",
                      "type": "custom",
                      "name": "Local RPC"
                    }
                  ],
                  "defaultRpcEndpointIndex": 0,
                  "defaultBlockExplorerUrlIndex": 0,
                  "blockExplorerUrls": ["https://test.io"],
                  "name": "Localhost",
                  "nativeCurrency": "ETH"
                },
                "0xaa36a7": {
                  "blockExplorerUrls": [],
                  "chainId": "0xaa36a7",
                  "defaultRpcEndpointIndex": 0,
                  "name": "Sepolia",
                  "nativeCurrency": "SepoliaETH",
                  "rpcEndpoints": [
                    {
                      "networkClientId": "sepolia",
                      "type": "infura",
                      "url": "https://sepolia.infura.io/v3/{infuraProjectId}"
                    }
                  ]
                },
                "0xe705": {
                  "blockExplorerUrls": [],
                  "chainId": "0xe705",
                  "defaultRpcEndpointIndex": 0,
                  "name": "Linea Sepolia",
                  "nativeCurrency": "LineaETH",
                  "rpcEndpoints": [
                    {
                      "networkClientId": "linea-sepolia",
                      "type": "infura",
                      "url": "https://linea-sepolia.infura.io/v3/{infuraProjectId}"
                    }
                  ]
                }
              }
            },
            "PhishingController": {
              "listState": {
                "allowlist": [],
                "fuzzylist": [
                  "cryptokitties.co",
                  "launchpad.ethereum.org",
                  "etherscan.io",
                  "makerfoundation.com",
                  "metamask.io",
                  "myetherwallet.com",
                  "opensea.io",
                  "satoshilabs.com"
                ],
                "version": 2,
                "name": "MetaMask",
                "tolerance": 1,
                "lastUpdated": 1684231917
              },
              "whitelist": [],
              "hotlistLastFetched": 1684231917,
              "stalelistLastFetched": 1684231917
            },
            "AccountsController": {
              "internalAccounts": {
                "accounts": {
                  "4d7a5e0b-b261-4aed-8126-43972b0fa0a1": {
                    "address": "0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3",
                    "id": "4d7a5e0b-b261-4aed-8126-43972b0fa0a1",
                    "metadata": {
                      "name": "Account 1",
                      "importTime": 1684232000456,
                      "keyring": {
                        "type": "HD Key Tree"
                      }
                    },
                    "options": {},
                    "methods": [
                      "personal_sign",
                      "eth_signTransaction",
                      "eth_signTypedData_v1",
                      "eth_signTypedData_v3",
                      "eth_signTypedData_v4"
                    ],
                    "type": "eip155:eoa",
                    "scopes": ["eip155:0"]
                  }
                },
                "selectedAccount": "4d7a5e0b-b261-4aed-8126-43972b0fa0a1"
              }
            },
            "PreferencesController": {
              "featureFlags": {},
              "identities": {
                "0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3": {
                  "address": "0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3",
                  "name": "Account 1",
                  "importTime": 1684232000456
                }
              },
              "ipfsGateway": "https://dweb.link/ipfs/",
              "lostIdentities": {},
              "selectedAddress": "0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3",
              "useTokenDetection": true,
              "useNftDetection": true,
              "displayNftMedia": true,
              "useSafeChainsListValidation": false,
              "isMultiAccountBalancesEnabled": true,
              "showTestNetworks": true
            },
            "TokenBalancesController": {
              "tokenBalances": {}
            },
            "TokenRatesController": {
              "marketData": {}
            },
            "TokensController": {
              "allTokens": {},
              "allIgnoredTokens": {},
              "allDetectedTokens": {}
            },
            "TransactionController": {
              "methodData": {},
              "transactions": [],
              "swapsTransactions": {}
            },
            "SwapsController": {
              "quotes": {},
              "quoteValues": {},
              "fetchParams": {
                "slippage": 0,
                "sourceToken": "",
                "sourceAmount": 0,
                "destinationToken": "",
                "walletAddress": ""
              },
              "fetchParamsMetaData": {
                "sourceTokenInfo": {
                  "decimals": 0,
                  "address": "",
                  "symbol": ""
                },
                "destinationTokenInfo": {
                  "decimals": 0,
                  "address": "",
                  "symbol": ""
                }
              },
              "topAggSavings": null,
              "aggregatorMetadata": null,
              "tokens": null,
              "topAssets": null,
              "approvalTransaction": null,
              "aggregatorMetadataLastFetched": 0,
              "quotesLastFetched": 0,
              "error": {
                "key": null,
                "description": null
              },
              "topAggId": null,
              "tokensLastFetched": 0,
              "isInPolling": false,
              "pollingCyclesLeft": 4,
              "quoteRefreshSeconds": null,
              "usedGasEstimate": null,
              "usedCustomGas": null,
              "chainCache": {
                "0x1": {
                  "aggregatorMetadata": null,
                  "tokens": null,
                  "topAssets": null,
                  "aggregatorMetadataLastFetched": 0,
                  "topAssetsLastFetched": 0,
                  "tokensLastFetched": 0
                }
              }
            },
            "GasFeeController": {
              "gasFeeEstimates": {},
              "estimatedGasFeeTimeBounds": {},
              "gasEstimateType": "none",
              "gasFeeEstimatesByChainId": {},
              "nonRPCGasFeeApisDisabled": false
            },
            "PermissionController": {
              "subjects": {}
            },
            "ApprovalController": {
              "pendingApprovals": {},
              "pendingApprovalCount": 0,
              "approvalFlows": []
            },
            "UserStorageController": {},
            "NotificationServicesController": {
              "subscriptionAccountsSeen": [],
              "isMetamaskNotificationsFeatureSeen": false,
              "isNotificationServicesEnabled": false,
              "isFeatureAnnouncementsEnabled": false,
              "metamaskNotificationsList": [],
              "metamaskNotificationsReadList": [],
              "isUpdatingMetamaskNotifications": false,
              "isFetchingMetamaskNotifications": false,
              "isUpdatingMetamaskNotificationsAccount": [],
              "isCheckingAccountsPresence": false
            },
            "MultichainNetworkController": {
              "selectedMultichainNetworkChainId": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
              "multichainNetworkConfigurationsByChainId": {},
              "isEvmSelected": true
            },
            "MultichainAssetsController": {
              "accountsAssets": {},
              "assetsMetadata": {}
            },
            "MultichainAssetsRatesController": {
              "conversionRates": {}
            },
            "CronJobController": {
              "jobs": {},
              "events": {}
            }
          }
        },
        "privacy": {
          "approvedHosts": {},
          "revealSRPTimestamps": []
        },
        "bookmarks": [],
        "browser": {
          "history": [],
          "whitelist": [],
          "tabs": [
            {
              "url": "https://google.com",
              "id": 1692550481062
            }
          ],
          "activeTab": 1692550481062,
          "favicons": []
        },
        "modals": {
          "networkModalVisible": false,
          "shouldNetworkSwitchPopToWallet": true,
          "collectibleContractModalVisible": false,
          "receiveModalVisible": false,
          "dappTransactionModalVisible": false,
          "signMessageModalVisible": true
        },
        "settings": {
          "searchEngine": "Google",
          "primaryCurrency": "ETH",
          "lockTime": 30000,
          "useBlockieIcon": true,
          "hideZeroBalanceTokens": false,
          "basicFunctionalityEnabled": true
        },
        "alert": {
          "isVisible": false,
          "autodismiss": null,
          "content": null,
          "data": null
        },
        "transaction": {
          "selectedAsset": {},
          "transaction": {}
        },
        "user": {
          "loadingMsg": "",
          "loadingSet": false,
          "passwordSet": true,
          "seedphraseBackedUp": true,
          "backUpSeedphraseVisible": false,
          "protectWalletModalVisible": false,
          "gasEducationCarouselSeen": false,
          "userLoggedIn": true,
          "isAuthChecked": false,
          "initialScreen": "",
          "appTheme": "os"
        },
        "wizard": {
          "step": 0
        },
        "onboarding": {
          "events": []
        },
        "notification": {
          "notifications": []
        },
        "swaps": {
          "0x1": {
            "isLive": true
          },
          "isLive": true,
          "hasOnboarded": false
        },
        "fiatOrders": {
          "orders": [],
          "customOrderIds": [],
          "networks": [
            {
              "active": true,
              "chainId": 1,
              "chainName": "Ethereum Mainnet",
              "shortName": "Ethereum",
              "nativeTokenSupported": true
            },
            {
              "active": true,
              "chainId": 10,
              "chainName": "Optimism Mainnet",
              "shortName": "Optimism",
              "nativeTokenSupported": true
            },
            {
              "active": true,
              "chainId": 25,
              "chainName": "Cronos Mainnet",
              "shortName": "Cronos",
              "nativeTokenSupported": true
            },
            {
              "active": true,
              "chainId": 56,
              "chainName": "BNB Chain Mainnet",
              "shortName": "BNB Chain",
              "nativeTokenSupported": true
            },
            {
              "active": true,
              "chainId": 137,
              "chainName": "Polygon Mainnet",
              "shortName": "Polygon",
              "nativeTokenSupported": true
            },
            {
              "active": true,
              "chainId": 250,
              "chainName": "Fantom Mainnet",
              "shortName": "Fantom",
              "nativeTokenSupported": true
            },
            {
              "active": true,
              "chainId": 1284,
              "chainName": "Moonbeam Mainnet",
              "shortName": "Moonbeam",
              "nativeTokenSupported": true
            },
            {
              "active": true,
              "chainId": 1285,
              "chainName": "Moonriver Mainnet",
              "shortName": "Moonriver",
              "nativeTokenSupported": true
            },
            {
              "active": true,
              "chainId": 42161,
              "chainName": "Arbitrum Mainnet",
              "shortName": "Arbitrum",
              "nativeTokenSupported": true
            },
            {
              "active": true,
              "chainId": 42220,
              "chainName": "Celo Mainnet",
              "shortName": "Celo",
              "nativeTokenSupported": true
            },
            {
              "active": true,
              "chainId": 43114,
              "chainName": "Avalanche C-Chain Mainnet",
              "shortName": "Avalanche C-Chain",
              "nativeTokenSupported": true
            },
            {
              "active": true,
              "chainId": 1313161554,
              "chainName": "Aurora Mainnet",
              "shortName": "Aurora",
              "nativeTokenSupported": false
            },
            {
              "active": true,
              "chainId": 1666600000,
              "chainName": "Harmony Mainnet (Shard 0)",
              "shortName": "Harmony  (Shard 0)",
              "nativeTokenSupported": true
            },
            {
              "active": true,
              "chainId": 11297108109,
              "chainName": "Palm Mainnet",
              "shortName": "Palm",
              "nativeTokenSupported": false
            },
            {
              "active": true,
              "chainId": 1337,
              "chainName": "Localhost",
              "shortName": "Localhost",
              "nativeTokenSupported": true
            },
            {
              "chainId": 1,
              "chainName": "Tenderly",
              "shortName": "Tenderly",
              "nativeTokenSupported": true
            }
          ],
          "selectedRegionAgg": null,
          "selectedPaymentMethodAgg": null,
          "getStartedAgg": false,
          "getStartedSell": false,
          "authenticationUrls": [],
          "activationKeys": []
        },
        "infuraAvailability": {
          "isBlocked": false
        },
        "navigation": {
          "currentRoute": "AdvancedSettings",
          "currentBottomNavRoute": "Wallet"
        },
        "networkOnboarded": {
          "networkOnboardedState": {},
          "networkState": {
            "showNetworkOnboarding": false,
            "nativeToken": "",
            "networkType": "",
            "networkUrl": ""
          },
          "switchedNetwork": {
            "networkUrl": "",
            "networkStatus": false
          }
        },
        "security": {
          "allowLoginWithRememberMe": false,
          "automaticSecurityChecksEnabled": false,
          "hasUserSelectedAutomaticSecurityCheckOption": true,
          "isAutomaticSecurityChecksModalOpen": false
        },
        "experimentalSettings": {
          "securityAlertsEnabled": true
        },
        "inpageProvider": {
          "networkId": "1"
        }
      },
      "asyncState": {
        "@MetaMask:existingUser": "true",
        "@MetaMask:onboardingWizard": "explored",
        "@MetaMask:UserTermsAcceptedv1.0": "true",
        "@MetaMask:WhatsNewAppVersionSeen": "7.24.3",
        "@MetaMask:solanaFeatureModalShown": "true"
      }
    }
    """.trimIndent()
}
