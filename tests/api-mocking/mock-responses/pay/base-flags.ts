export const BASE_FLAGS_DATA = [
  {
    'additionalNetworksBlacklist': [
      '0x1079',
      '0x13b2'
    ]
  },
  {
    'assetsAccountApiBalances': [
      '0x1',
      '0xe708',
      '0x2105',
      '0x89',
      '0xa4b1',
      '0xa',
      '0x38'
    ]
  },
  {
    'assetsAccountApiV4MinimumVersion': {
      'minimumVersion': false
    }
  },
  {
    'assetsAccountsApiV6': [
      {
        'name': 'feature is ON',
        'scope': {
          'type': 'threshold',
          'value': 0
        },
        'value': true
      },
      {
        'name': 'feature is OFF',
        'scope': {
          'type': 'threshold',
          'value': 1
        },
        'value': false
      }
    ]
  },
  {
    'assetsUnifyState': {
      'versions': {
        '8.3.0': {
          'featureVersion': '1',
          'minimumVersion': '8.3.0',
          'enabled': true
        },
        '7.60.0': {
          'enabled': false,
          'featureVersion': null,
          'minimumVersion': null
        }
      }
    }
  },
  {
    'confirmation_redesign': {
      'contract_deployment': true,
      'contract_interaction': true,
      'signatures': true,
      'staking_confirmations': true,
      'transfer': true,
      'approve': true
    }
  },
  {
    'confirmations_eip_7702': {
      'supportedChains': [
        '0x1',
        '0x1012',
        '0x1079',
        '0x13882',
        '0x138c5',
        '0x138de',
        '0x13fb',
        '0x14a34',
        '0x152',
        '0x18c6',
        '0x19',
        '0x2105',
        '0x279f',
        '0x27d8',
        '0x38',
        '0x3909',
        '0x483',
        '0x515',
        '0x530',
        '0x531',
        '0x61',
        '0x64',
        '0x66eee',
        '0x82',
        '0x88bb0',
        '0x89',
        '0x8f',
        '0x92',
        '0xa',
        '0xa4b1',
        '0xa4ba',
        '0xa4ec',
        '0xa5bf',
        '0xaa044c',
        '0xaa36a7',
        '0xaa37dc',
        '0xe708'
      ],
      'contracts': {
        '0xa4b1': [
          {
            'name': 'Arbitrum One',
            'signature': '0xc3be82057efec197d92b0cbb7cef9d50dba0345646524687a3ae7235a8fcb1706ba79f197d45fcf4c6cfb5808ef70258c5f6bb29b7e3553a4b9660692eb5e81d1b',
            'address': '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B'
          }
        ],
        '0x1': [
          {
            'name': 'Mainnet',
            'signature': '0xffb37facfedf12f1e98b56203de1c855391b791a20ee361234c546f4b50eb11853283cfc311419049f0325ad0a806ec232cc519073e3b5d4ad59ff331964d2e71b',
            'address': '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B'
          }
        ]
      },
      'name': 'dev'
    }
  },
  {
    'confirmations_gas_buffer': {
      'perChainConfig': {
        '0x2105': {
          'eip7702': 1.3,
          'name': 'base'
        },
        '0x38': {
          'eip7702': 1.3,
          'name': 'bnb'
        },
        '0xa': {
          'eip7702': 1.3,
          'name': 'optimism'
        },
        '0xa4b1': {
          'name': 'arbitrum',
          'base': 1.2
        },
        '0x18c6': {
          'base': 1.3,
          'name': 'megaeth'
        }
      },
      'default': 1,
      'included': 1.5
    }
  },
  {
    'confirmations_gas_fee_tokens': {
      'gasFeeTokens': {
        '0xa4b1': {
          'tokens': [
            {
              'name': 'ARB',
              'address': '0x912CE59144191C1204E64559FE8253a0e49E6548'
            },
            {
              'name': 'USDT',
              'address': '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
            },
            {
              'address': '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
              'name': 'USDC'
            },
            {
              'address': '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
              'name': 'USDC.e'
            },
            {
              'address': '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
              'name': 'DAI'
            },
            {
              'address': '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
              'name': 'WETH'
            },
            {
              'name': 'WBTC',
              'address': '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'
            }
          ],
          'name': 'Arbitrum Mainnet'
        }
      }
    }
  },
  {
    'confirmations_incoming_transactions': {
      'useBackendWebSocketService': true,
      'enabled': true
    }
  },
  {
    'confirmations_pay': {
      'bufferInitial': 0.015,
      'slippage': 0.02,
      'perpsWithdrawAnyToken': false,
      'relayExecuteUrl': 'https://intents.uat-api.cx.metamask.io/relay/execute',
      'payStrategies': {
        'relay': {
          'pollingInterval': 1500,
          'pollingTimeout': 180000,
          'enabled': true,
          'executeEnabled': false,
          'gaslessEnabled': true,
          'originGasOverhead': '300000'
        },
        'across': {
          'apiBase': 'https://intents.uat-api.cx.metamask.io/across',
          'enabled': false,
          'fallbackGas': {
            'estimate': 900001,
            'max': 1500001
          }
        }
      },
      'attemptsMax': 4,
      'strategyOrder': [
        'relay'
      ],
      'slippageTokens': {
        '0xa4b1': {
          '0xaf88d065e77c8cC2239327C5EDb3A432268e5831': 0.005,
          '0x0000000000000000000000000000000000000000': 0.005,
          '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1': 0.005,
          '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9': 0.005
        }
      },
      'relayDisabledGasStationChains': [],
      'stxDisabled': false,
      'allowedPredictWithdrawTokens': {
        '0x1': [
          '0x0000000000000000000000000000000000000000',
          '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
        ],
        '0x38': [
          '0x0000000000000000000000000000000000000000',
          '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d'
        ],
        '0x89': [
          '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
          '0x0000000000000000000000000000000000000000',
          '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'
        ]
      },
      'bufferStep': 0.015,
      'bufferSubsequent': 0.05,
      'relayQuoteUrl': 'https://intents.uat-api.cx.metamask.io/relay/quote',
      'dev': true,
      'relayFallbackGas': {
        'max': '1500001',
        'estimate': '900001'
      },
      'predictWithdrawAnyToken': true
    }
  },
  {
    'confirmations_pay_extended': {
      'enableMoneyAccountTransactions': {
        'perpsDeposit': true,
        'perpsWithdraw': false,
        'predictDeposit': true,
        'predictWithdraw': false
      },
      'excludeChainIdsFromInfura': [
        '0x8f'
      ],
      'name': 'rc',
      'payStrategies': {
        'relay': {
          'gaslessEnabled': true
        }
      },
      'prefilledAmount': {
        'overrides': {
          'moneyAccountDeposit': {
            'enabled': false
          }
        },
        'default': {
          'enabled': false
        }
      },
      'depositLimit': {
        'moneyAccountDeposit': 500000
      },
      'enableDepositWalletWithdraw': true
    }
  },
  {
    'confirmations_pay_fiat': {
      'versions': {
        '8.0.0': {
          'orderPollTimeoutMs': 600000,
          'assetPerTransactionType': {
            'predictDeposit': {
              'chainId': '0x89',
              'address': '0x0000000000000000000000000000000000001010'
            },
            'moneyAccountDeposit': {
              'address': '0x0000000000000000000000000000000000000000',
              'chainId': '0x1'
            },
            'perpsDeposit': {
              'chainId': '0xa4b1',
              'address': '0x0000000000000000000000000000000000000000'
            }
          },
          'directMoneyMusdEnabled': true,
          'enabledTransactionTypes': [
            'moneyAccountDeposit'
          ],
          'feeReserveMultiplier': 1.2,
          'maxRateDriftPercent': 10
        }
      }
    }
  },
  {
    'confirmations_pay_hardware': {
      'enabled': false
    }
  },
  {
    'confirmations_pay_post_quote': {
      'rc': true,
      'versions': {
        '8.0.0': {
          'overrides': {
            'moneyAccountWithdraw': {
              'enabled': true,
              'tokens': {
                '0x8f': [
                  '0xacA92E438df0B2401fF60dA7E4337B687a2435DA'
                ],
                '0xa4b1': [
                  '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
                ],
                '0xe708': [
                  '0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
                  '0x176211869cA2b568f2A7D4EE941E073a821EE1ff'
                ],
                '0x1': [
                  '0x0000000000000000000000000000000000000000',
                  '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                  '0xdAC17F958D2ee523a2206206994597C13D831ec7',
                  '0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
                  '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
                  '0x6B175474E89094C44Da98b954EedeAC495271d0F'
                ],
                '0x2105': [
                  '0x0000000000000000000000000000000000000000',
                  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
                ],
                '0x38': [
                  '0x0000000000000000000000000000000000000000',
                  '0x55d398326f99059fF775485246999027B3197955',
                  '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d'
                ],
                '0x89': [
                  '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
                ]
              }
            },
            'perpsWithdraw': {
              'enabled': true,
              'tokens': {
                '0xa4b1': [
                  '0x0000000000000000000000000000000000000000',
                  '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
                  '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
                ],
                '0xe708': [
                  '0x0000000000000000000000000000000000000000',
                  '0xacA92E438df0B2401fF60dA7E4337B687a2435DA'
                ],
                '0x1': [
                  '0x0000000000000000000000000000000000000000',
                  '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                  '0xdAC17F958D2ee523a2206206994597C13D831ec7',
                  '0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
                  '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'
                ],
                '0x2105': [
                  '0x0000000000000000000000000000000000000000',
                  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
                ],
                '0x38': [
                  '0x0000000000000000000000000000000000000000',
                  '0x55d398326f99059fF775485246999027B3197955',
                  '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d'
                ],
                '0x89': [
                  '0x0000000000000000000000000000000000001010',
                  '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
                  '0xc2132d05d31c914a87c6611c10748aeb04b58e8f'
                ]
              }
            },
            'predictWithdraw': {
              'tokens': {
                '0x1': [
                  '0x0000000000000000000000000000000000000000',
                  '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                  '0xdAC17F958D2ee523a2206206994597C13D831ec7',
                  '0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
                  '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'
                ],
                '0x2105': [
                  '0x0000000000000000000000000000000000000000',
                  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
                ],
                '0x38': [
                  '0x0000000000000000000000000000000000000000',
                  '0x55d398326f99059fF775485246999027B3197955',
                  '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d'
                ],
                '0x89': [
                  '0x0000000000000000000000000000000000001010',
                  '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
                  '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                  '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
                  '0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB'
                ],
                '0xa4b1': [
                  '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
                ],
                '0xe708': [
                  '0xacA92E438df0B2401fF60dA7E4337B687a2435DA'
                ]
              },
              'enabled': true
            }
          },
          'default': {
            'tokens': {},
            'enabled': true
          }
        }
      }
    }
  },
  {
    'confirmations_pay_tokens': {
      'blockedTokens': {
        'overrides': {
          'predictDeposit': {
            'tokens': [
              {
                'chainId': '0x1',
                'address': '0x66a3c2fa3e467aa586e90912f977e648589cabaf'
              },
              {
                'address': '0x0000000000000000000000000000000000000000',
                'chainId': '0x8f'
              }
            ],
            'chainIds': [
              '0xaa36a7',
              '0xe705',
              '0x4cef52'
            ]
          },
          'perpsDeposit': {
            'tokens': [
              {
                'address': '0x33A3d962955A3862C8093D1273344719f03cA17C',
                'chainId': '0x38'
              },
              {
                'address': '0x0000000000000000000000000000000000000000',
                'chainId': '0x8f'
              }
            ],
            'chainIds': [
              '0xaa36a7',
              '0xe705',
              '0x4cef52'
            ]
          }
        },
        'default': {
          'chainIds': [
            '0xaa36a7',
            '0xe705',
            '0x4cef52'
          ],
          'tokens': [
            {
              'address': '0x66a3c2fa3e467aa586e90912f977e648589cabaf',
              'chainId': '0x1'
            },
            {
              'address': '0x0000000000000000000000000000000000000000',
              'chainId': '0x8f'
            }
          ]
        }
      },
      'minimumRequiredTokenBalance': 10,
      'preferredTokens': {
        'default': [],
        'overrides': {
          'perpsDeposit': [
            {
              'successRate': 93.89,
              'address': '0x0000000000000000000000000000000000000000',
              'chainId': '0x1',
              'name': 'ETH'
            },
            {
              'address': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eb48',
              'chainId': '0x1',
              'name': 'USDC',
              'successRate': 93.17
            },
            {
              'successRate': 90.73,
              'address': '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
              'chainId': '0xa4b1',
              'name': 'USDC'
            },
            {
              'address': '0x0000000000000000000000000000000000000000',
              'chainId': '0xa4b1',
              'name': 'ETH',
              'successRate': 96.55
            },
            {
              'address': '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
              'chainId': '0xa4b1',
              'name': 'USDT',
              'successRate': 97.5
            }
          ],
          'perpsWithdraw': [
            {
              'chainId': '0x1',
              'name': 'mUSD',
              'address': '0xacA92E438df0B2401fF60dA7E4337B687a2435DA'
            }
          ],
          'predictDeposit': [
            {
              'name': 'ETH',
              'successRate': 88.47,
              'address': '0x0000000000000000000000000000000000000000',
              'chainId': '0x1'
            },
            {
              'address': '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
              'chainId': '0x89',
              'name': 'USDC',
              'successRate': 87.55
            },
            {
              'address': '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
              'chainId': '0x89',
              'name': 'USDC.e',
              'successRate': 90.04
            }
          ],
          'predictWithdraw': [
            {
              'chainId': '0x1',
              'name': 'mUSD',
              'address': '0xacA92E438df0B2401fF60dA7E4337B687a2435DA'
            }
          ],
          'moneyAccountDeposit': [
            {
              'address': '0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
              'chainId': '0x8f',
              'name': 'mUSD',
              'successRate': 100
            },
            {
              'name': 'USDC',
              'successRate': 100,
              'address': '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
              'chainId': '0xa4b1'
            }
          ]
        }
      },
      'rc': true
    }
  },
  {
    'confirmations_relay_fixed_spread': {
      'tokens': {
        'base_usdc': '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
        'monad_usdc': '0x754704bc059f8c67012fed69bc8a327a5aafb603',
        'arbitrum_usdc': '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
        'musd': '0xaca92e438df0b2401ff60da7e4337b687a2435da',
        'eth_usdc': '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
      },
      'chains': {
        'arbitrum': '0xa4b1',
        'base': '0x2105',
        'bsc': '0x38',
        'eth': '0x1',
        'linea': '0xe708',
        'monad': '0x8f'
      },
      'rc': true,
      'routes': [
        [
          'monad',
          'monad_usdc',
          'monad',
          'musd'
        ],
        [
          'arbitrum',
          'arbitrum_usdc',
          'monad',
          'musd'
        ],
        [
          'base',
          'base_usdc',
          'monad',
          'musd'
        ],
        [
          'eth',
          'eth_usdc',
          'monad',
          'musd'
        ]
      ]
    }
  },
  {
    'confirmations_transactions': {
      'batchSizeLimit': 10,
      'gasEstimateFallback': {
        'perChainConfig': {
          '0x279f': {
            'fixed': 1000000
          }
        }
      },
      'gasFeeRandomisation': {
        'randomisedGasFeeDigits': {
          '0x2105': 5
        }
      },
      'timeoutAttempts': {
        'default': 30,
        'perChainConfig': {
          '0xa4b1': 800,
          '0x2105': 100,
          '0x38': 300,
          '0x3e7': 240
        }
      },
      'acceleratedPolling': {
        'defaultCountMax': 10,
        'defaultIntervalMs': 3000,
        'perChainConfig': {
          '0xa4b1': {
            'blockTime': 250,
            'chainId': '42161',
            'countMax': 15,
            'intervalMs': 500,
            'name': 'ARBITRUM_ONE'
          },
          '0x1': {
            'countMax': 10,
            'intervalMs': 3000,
            'name': 'ETHEREUM',
            'blockTime': 12000,
            'chainId': '1'
          }
        }
      }
    }
  },
  {
    'contentfulCarouselEnabled': true
  },
  {
    'enableFiatToggle': true
  },
  {
    'enableMultichainAccounts': {
      'enabled': true,
      'featureVersion': '1',
      'minimumVersion': '7.53.0'
    }
  },
  {
    'enableMultichainAccountsState2': {
      'featureVersion': '2',
      'minimumVersion': '7.57.0',
      'enabled': true
    }
  },
  {
    'fullPageAccountList': true
  },
  {
    'homeTMCU1103AbtestActionButtonsGrid': [
      {
        'scope': {
          'type': 'percentage_rollout',
          'value': 0.8
        },
        'name': 'control'
      },
      {
        'scope': {
          'value': 0.9,
          'type': 'percentage_rollout'
        },
        'name': 'row1Top'
      },
      {
        'name': 'row2Top',
        'scope': {
          'type': 'percentage_rollout',
          'value': 1
        }
      }
    ]
  },
  {
    'homeTMCU1209AbtestHomepageBalanceBreakdown': {
      'enabled': false
    }
  },
  {
    'homeTMCU470AbtestTrendingSections': {
      'enabled': false
    }
  },
  {
    'homeTMCU610AbtestWalletHomePostOnboardingSteps': [
      {
        'name': 'control',
        'scope': {
          'value': 0.5,
          'type': 'percentage_rollout'
        }
      },
      {
        'name': 'postOnboardingSteps',
        'scope': {
          'value': 1,
          'type': 'percentage_rollout'
        }
      }
    ]
  },
  {
    'homeTMCU725AbtestHomepagePerpsPillsEmptyState': [
      {
        'scope': {
          'type': 'percentage_rollout',
          'value': 0
        },
        'name': 'control'
      },
      {
        'name': 'treatment',
        'scope': {
          'type': 'percentage_rollout',
          'value': 1
        }
      }
    ]
  },
  {
    'homeTMCU828AbtestOnboardingChecklistStepper': {
      'enabled': false
    }
  },
  {
    'homeTMCU926AbtestDiscoveryPills': {
      'enabled': false
    }
  },
  {
    'homepageRedesignV1': {
      'enabled': true,
      'minimumVersion': '7.59'
    }
  },
  {
    'homepageSectionsV1': {
      'enabled': true,
      'minimumVersion': '7.70.0'
    }
  },
  {
    'mobileUxAccountMenu': true
  },
  {
    'mobileUxNetworkManagement': {
      'enabled': true,
      'minimumVersion': '7.69.0'
    }
  },
  {
    'moneyAccount': {
      'moneyAccountDepositEnabled': true,
      'moneyAccountWithdrawEnabled': true
    }
  },
  {
    'moneyAccountBalanceSource': 'rpc'
  },
  {
    'moneyAccountBalanceStaletime': 120000
  },
  {
    'moneyAccountChompConfig': {
      'baseUrl': 'https://chomp.api.cx.metamask.io'
    }
  },
  {
    'moneyAccountGeoBlockedCountries': {
      'blockedRegions': [
        'GB'
      ]
    }
  },
  {
    'moneyAccountVaultConfig': {
      'lensAddress': '0xa3b5f71AB29BA99B9750327575Dcc456CadC550b',
      'tellerAddress': '0xB30755C750E0A7E5BeD3dDAf0D9948Cf2b1CDc87',
      'underlyingToken': '0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
      'accountantAddress': '0x98A45D90E81849a5743241d3ff765F9Fd788206a',
      'boringVault': '0x1C8a336051D2024E318A229d01F9F6CF96efD316',
      'chainId': '0x8f'
    }
  },
  {
    'moneyAccountWithdrawalSlippageTolerance': {
      'slippageBps': 0
    }
  },
  {
    'moneyActivityMockDataEnabled': false
  },
  {
    'moneyEnableActivityDetails': {
      'enabled': true,
      'minimumVersion': '7.83.0'
    }
  },
  {
    'moneyEnableActivityDetailsBlockexplorerLink': {
      'enabled': true,
      'minimumVersion': '7.83.0'
    }
  },
  {
    'moneyEnableMoneyAccount': {
      'enabled': true,
      'minimumVersion': '0.0.0'
    }
  },
  {
    'moneyEnableOnboardingStepperAnimation': {
      'minimumVersion': '8.0.0',
      'enabled': true
    }
  },
  {
    'moneyHomeScreenEnabled': {
      'enabled': true,
      'minimumVersion': '7.82.0'
    }
  },
  {
    'moneyShowMoneyAccountAddress': {
      'enabled': false,
      'minimumVersion': '0.0.0'
    }
  },
  {
    'perpsAbtestButtonColor': 'monochrome'
  },
  {
    'perpsAdvancedChartEnabled': false
  },
  {
    'perpsAdvancedChartEnabledV2': {
      'minimumVersion': '8.3.0',
      'enabled': true
    }
  },
  {
    'perpsDefaultPayTokenWhenNoBalanceEnabled': {
      'enabled': false
    }
  },
  {
    'perpsFeedbackEnabled': {
      'enabled': true,
      'minimumVersion': '7.62.0'
    }
  },
  {
    'perpsHip3AllowlistMarkets': 'xyz:*'
  },
  {
    'perpsHip3BlocklistMarkets': ''
  },
  {
    'perpsHip3Enabled': {
      'minimumVersion': '7.60.4',
      'enabled': true
    }
  },
  {
    'perpsMyxProviderEnabled': {
      'minimumVersion': '7.70.0',
      'enabled': false
    }
  },
  {
    'perpsOrderBookEnabled': {
      'minimumVersion': '7.68.0',
      'enabled': true
    }
  },
  {
    'perpsPayWithAnyTokenAllowlistAssets': '0x1.0x0000000000000000000000000000000000000000,0x1.0xdac17f958d2ee523a2206206994597c13d831ec7,0x1.0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48,0x1.0xaca92e438df0b2401ff60da7e4337b687a2435da,0x1.0x2260fac5e5542a773aa44fbcfedf7c193bc2c599,0xa4b1.0x0000000000000000000000000000000000000000,0xa4b1.0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9,0xa4b1.0xaf88d065e77c8cc2239327c5edb3a432268e5831,0xa4b1.0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f,0x2105.0x0000000000000000000000000000000000000000,0x2105.0x833589fcd6edb6e08f4c7c32d4f71b54bda02913,0x2105.0x0555e30da8f98308edb960aa94c0db47230d2b9c,0xe708.0x0000000000000000000000000000000000000000,0xe708.0xa219439258ca9da29e9cc4ce5596924745e12b93,0xe708.0x176211869ca2b568f2a7d4ee941e073a821ee1ff,0xe708.0xaca92e438df0b2401ff60da7e4337b687a2435da,0x38.0x0000000000000000000000000000000000000000,0x38.0x55d398326f99059ff775485246999027b3197955,0x38.0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d,0x38.0xaca92e438df0b2401ff60da7e4337b687a2435da,0x38.0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c,0x89.0x0000000000000000000000000000000000000000,0x89.0xc2132d05d31c914a87c6611c10748aeb04b58e8f,0x89.0x3c499c542cef5e3811e1192ce70d8cc03d5c3359,0x89.0x2791bca1f2de4661ed88a30c99a7a9449aa84174,0x89.0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6'
  },
  {
    'perpsPerpGtmOnboardingModalEnabled': {
      'minimumVersion': '0.0.0',
      'enabled': false
    }
  },
  {
    'perpsPerpTradingEnabled': {
      'enabled': true,
      'minimumVersion': '7.56.0'
    }
  },
  {
    'perpsPerpTradingGeoBlockedCountries': {
      'blockedRegions': []
    }
  },
  {
    'perpsPerpTradingGeoBlockedCountriesV2': {
      'blockedRegions': [
        'BE',
        'US',
        'CA-ON',
        'GB'
      ]
    }
  },
  {
    'perpsPerpTradingServiceInterruptionBannerEnabled': {
      'enabled': false,
      'minimumVersion': '0.0.0'
    }
  },
  {
    'perpsRecentlyAddedEnabled': {
      'minimumVersion': '8.3.0',
      'enabled': true
    }
  },
  {
    'perpsRecentlyViewedEnabled': {
      'enabled': true,
      'minimumVersion': '8.4.0'
    }
  },
  {
    'perpsRelatedMarkets': {
      'minimumVersion': '7.68.0',
      'enabled': true
    }
  },
  {
    'perpsSlippageConfig': {
      'enabled': true,
      'minimumVersion': '7.81.0'
    }
  },
  {
    'perpsTopMoversEnabled': {
      'enabled': true,
      'minimumVersion': '7.81.0'
    }
  },
  {
    'perpsTradeWithAnyTokenIsEnabled': {
      'enabled': true,
      'minimumVersion': '7.66.0'
    }
  },
  {
    'perpsWatchlistV2Enabled': {
      'minimumVersion': '7.82.0',
      'enabled': true
    }
  },
  {
    'perpsClosePositionLimitOrderEnabled': {
      'enabled': true,
      'minimumVersion': '8.3.0'
    }
  },
  {
    'perpsCompetitionBannerEnabled': {
      'enabled': true,
      'minimumVersion': '7.80.0'
    }
  },
  {
    'perpsMarketAboutEnabled': {
      'enabled': false,
      'minimumVersion': '7.0.0'
    }
  },
  {
    'perpsProModeEnabled': {
      'minimumVersion': '8.3.0',
      'enabled': false
    }
  },
  {
    'perpsProductsEnabled': {
      'enabled': true,
      'minimumVersion': '7.82.0'
    }
  },
  {
    'perpsShowFullAssetNames': {
      'minimumVersion': '8.3.0',
      'enabled': true
    }
  },
  {
    'perpsTerminalBackendEnabled': {
      'enabled': true,
      'minimumVersion': '8.3.0'
    }
  },
  {
    'predictBottomSheet': {
      'enabled': true,
      'minimumVersion': '7.78.0'
    }
  },
  {
    'predictClobV2': {
      'enabled': true,
      'minimumVersion': '7.73.1'
    }
  },
  {
    'predictClobV2UseLegacyClobHost': {
      'enabled': false,
      'minimumVersion': '0.0.0'
    }
  },
  {
    'predictFakOrders': {
      'enabled': true,
      'minimumVersion': '7.68.0'
    }
  },
  {
    'predictFeeCollection': {
      'executors': [
        '0x100c7b833bbd604a77890783439bbb9d65e31de7',
        '0xf272fc093c35357fb7ce131c410fd43ed28e8e57',
        '0xf4d1a2a32c0fd75c0dde90c11980763d477c1d6e',
        '0xf013f2788203ce23a05aea279ea19f8e7d062dc8',
        '0x228f39a22d48b8410c6e7bdc426f6260a17ab70a'
      ],
      'metamaskFee': 0.03,
      'permit2Enabled': true,
      'providerFee': 0.01,
      'waiveList': [],
      'collector': '0xe19b9720890539ac74AC32290626d2BA00E2e5a8',
      'enabled': true
    }
  },
  {
    'predictGtmOnboardingModalEnabled': {
      'enabled': false,
      'minimumVersion': '0.0.0'
    }
  },
  {
    'predictHomeFeaturedVariant': {
      'enabled': true,
      'minimumVersion': '7.65.0',
      'variant': 'list'
    }
  },
  {
    'predictHomeRedesign': {
      'enabled': false,
      'minimumVersion': '0.0.0'
    }
  },
  {
    'predictHotTab': {
      'enabled': false,
      'minimumVersion': '0.0.0'
    }
  },
  {
    'predictPortfolio': {
      'enabled': true,
      'minimumVersion': '7.81.0'
    }
  },
  {
    'predictTradingEnabled': {
      'enabled': true,
      'minimumVersion': '7.60.0'
    }
  },
  {
    'predictUpDown': {
      'minimumVersion': '7.79.0',
      'enabled': true
    }
  },
  {
    'predictWithAnyToken': {
      'enabled': true,
      'minimumVersion': '7.79.0'
    }
  },
  {
    'sendRedesign': {
      'enabled': true
    }
  },
  {
    'smartTransactionsAllowedRpcHosts': [
      '.infura.io',
      '.binance.org',
      'mainnet.base.org',
      'rpc.linea.build'
    ]
  },
  {
    'smartTransactionsNetworks': {
      '0x8f': {
        'sentinelUrl': 'https://tx-sentinel-monad-mainnet.api.cx.metamask.io'
      },
      '0x89': {
        'mobileActiveAndroid': true,
        'mobileActiveIOS': true,
        'sentinelUrl': 'https://tx-sentinel-polygon-mainnet.api.cx.metamask.io',
        'gaslessBridgeWith7702Enabled': true,
        'mobileActive': true
      },
      'default': {
        'mobileActiveIOS': false,
        'mobileReturnTxHashAsap': true,
        'batchStatusPollingInterval': 1000,
        'expectedDeadline': 45,
        'maxDeadline': 150,
        'mobileActive': false,
        'mobileActiveAndroid': false
      },
      '0xa4b1': {
        'mobileActiveIOS': true,
        'sentinelUrl': 'https://tx-sentinel-arbitrum-mainnet.api.cx.metamask.io',
        'gaslessBridgeWith7702Enabled': true,
        'mobileActive': true,
        'mobileActiveAndroid': true
      },
      '0x2105': {
        'mobileActiveAndroid': true,
        'mobileActiveIOS': true,
        'sentinelUrl': 'https://tx-sentinel-base-mainnet.api.cx.metamask.io',
        'gaslessBridgeWith7702Enabled': true,
        'mobileActive': true
      },
      '0xe708': {
        'mobileActiveAndroid': true,
        'mobileActiveIOS': true,
        'sentinelUrl': 'https://tx-sentinel-linea-mainnet.api.cx.metamask.io',
        'gaslessBridgeWith7702Enabled': false,
        'mobileActive': true
      },
      '0x1': {
        'expectedDeadline': 45,
        'gaslessBridgeWith7702Enabled': false,
        'maxDeadline': 160,
        'mobileActive': true,
        'mobileActiveAndroid': true,
        'mobileActiveIOS': true,
        'sentinelUrl': 'https://tx-sentinel-ethereum-mainnet.api.cx.metamask.io'
      }
    }
  },
  {
    'stableTokens': {
      '0x38': [
        '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
        '0x00901a076785e0906d1028c7d6372d247bec7d61',
        '0x55d398326f99059ff775485246999027b3197955',
        '0xa9251ca9de909cb71783723713b21e4233fbf1b1'
      ],
      '0x8f': [
        '0x754704bc059f8c67012fed69bc8a327a5aafb603',
        '0xaca92e438df0b2401ff60da7e4337b687a2435da'
      ],
      '0xa4b1': [
        '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
        '0x724dc807b04555b71ed48a6896b6f41593b8c637'
      ],
      '0xe708': [
        '0xaca92e438df0b2401ff60da7e4337b687a2435da'
      ],
      'rc': true,
      '0x1': [
        '0xaca92e438df0b2401ff60da7e4337b687a2435da',
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        '0x98c23e9d8f34fefb1b7bd6a91b7ff122f4e16f5c',
        '0xdac17f958d2ee523a2206206994597c13d831ec7',
        '0x23878914efe38d27c4d67ab83ed1b93a74d4086a',
        '0x6b175474e89094c44da98b954eedeac495271d0f',
        '0x018008bfb33d285247a21d44e50697654f754e63'
      ],
      '0x2105': [
        '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
        '0x4e65fe4dba92790696d040ac24aa414708f5c0ab'
      ]
    }
  },
  {
    'stxMigrationBatchStatus': [
      {
        'value': true,
        'name': 'sentinel on',
        'scope': {
          'value': 1,
          'type': 'threshold'
        }
      },
      {
        'name': 'sentinel off',
        'scope': {
          'value': 0,
          'type': 'threshold'
        },
        'value': false
      }
    ]
  },
  {
    'stxMigrationCancel': [
      {
        'name': 'sentinel on',
        'scope': {
          'type': 'threshold',
          'value': 1
        },
        'value': true
      },
      {
        'value': false,
        'name': 'sentinel off',
        'scope': {
          'type': 'threshold',
          'value': 0
        }
      }
    ]
  },
  {
    'stxMigrationGetFees': [
      {
        'value': true,
        'name': 'sentinel on',
        'scope': {
          'value': 1,
          'type': 'threshold'
        }
      },
      {
        'value': false,
        'name': 'sentinel off',
        'scope': {
          'type': 'threshold',
          'value': 0
        }
      }
    ]
  },
  {
    'stxMigrationSubmitTransactions': [
      {
        'scope': {
          'type': 'threshold',
          'value': 1
        },
        'value': true,
        'name': 'sentinel on'
      },
      {
        'name': 'sentinel off',
        'scope': {
          'type': 'threshold',
          'value': 0
        },
        'value': false
      }
    ]
  },
  {
    'tmcuActivityRedesignEnabled': {
      'enabled': true,
      'minimumVersion': '8.5.0'
    }
  },
  {
    'tmcuTransactionsRedesignEnabled': {
      'enabled': true,
      'minimumVersion': '8.5.0'
    }
  },
  {
    'walletHomeOnboardingSteps': {
      'enabled': true,
      'minimumVersion': '0.0.0'
    }
  }
];
