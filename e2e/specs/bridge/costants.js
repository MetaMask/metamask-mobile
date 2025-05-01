export const ETH_TO_BASE_URL = 'https://bridge.dev-api.cx.metamask.io/getQuote?walletAddress=0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3&destWalletAddress=0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3&srcChainId=1&destChainId=8453&srcTokenAddress=0x0000000000000000000000000000000000000000&destTokenAddress=0x0000000000000000000000000000000000000000&srcTokenAmount=1000000000000000000&insufficientBal=false&resetApproval=false&slippage=0.5';

export const ETH_TO_BASE_RESPONSE = [
  {
    'quote': {
      'requestId': '8dc6d5a5-3217-4cff-9588-21bf8822ced0',
      'srcChainId': 1,
      'srcTokenAmount': '991250000000000000',
      'srcAsset': {
        'address': '0x0000000000000000000000000000000000000000',
        'chainId': 1,
        'assetId': 'eip155:1/slip44:60',
        'symbol': 'ETH',
        'decimals': 18,
        'name': 'Ethereum',
        'coingeckoId': 'ethereum',
        'aggregators': [

        ],
        'occurrences': 100,
        'iconUrl': 'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/native/60.png',
        'metadata': {
          'honeypotStatus': {

          },
          'isContractVerified': false,
          'erc20Permit': false,
          'description': {},
          'createdAt': '2023-10-31T22:41:58.553Z'
        },
        'price': '1866.086661'
      },
      'destChainId': 8453,
      'destTokenAmount': '991167421942812774',
      'destAsset': {
        'address': '0x0000000000000000000000000000000000000000',
        'chainId': 8453,
        'assetId': 'eip155:8453/slip44:8453',
        'symbol': 'ETH',
        'decimals': 18,
        'name': 'Ether',
        'coingeckoId': 'base',
        'aggregators': [

        ],
        'occurrences': 100,
        'iconUrl': 'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/8453/native/8453.png',
        'metadata': {
          'honeypotStatus': {

          },
          'erc20Permit': false,
          'createdAt': '2023-10-31T21:47:47.414Z'
        },
        'price': '1866.086661'
      },
      'feeData': {
        'metabridge': {
          'amount': '8750000000000000',
          'asset': {
            'address': '0x0000000000000000000000000000000000000000',
            'chainId': 1,
            'assetId': 'eip155:1/slip44:60',
            'symbol': 'ETH',
            'decimals': 18,
            'name': 'Ethereum',
            'coingeckoId': 'ethereum',
            'aggregators': [

            ],
            'occurrences': 100,
            'iconUrl': 'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/native/60.png',
            'metadata': {
              'honeypotStatus': {

              },
              'isContractVerified': false,
              'erc20Permit': false,
              'description': {},
              'createdAt': '2023-10-31T22:41:58.553Z'
            },
            'price': '1866.086661'
          }
        }
      },
      'bridgeId': 'lifi',
      'bridges': [
        'across'
      ],
      'steps': [
        {
          'action': 'bridge',
          'srcChainId': 1,
          'destChainId': 8453,
          'protocol': {
            'name': 'across',
            'displayName': 'AcrossV3',
            'icon': 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/bridges/acrossv2.png'
          },
          'srcAsset': {
            'address': '0x0000000000000000000000000000000000000000',
            'chainId': 1,
            'assetId': 'eip155:1/slip44:60',
            'symbol': 'ETH',
            'decimals': 18,
            'name': 'Ethereum',
            'coingeckoId': 'ethereum',
            'aggregators': [

            ],
            'occurrences': 100,
            'iconUrl': 'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/native/60.png',
            'metadata': {
              'honeypotStatus': {

              },
              'isContractVerified': false,
              'erc20Permit': false,
              'description': {},
              'createdAt': '2023-10-31T22:41:58.553Z'
            }
          },
          'destAsset': {
            'address': '0x0000000000000000000000000000000000000000',
            'chainId': 8453,
            'assetId': 'eip155:8453/slip44:8453',
            'symbol': 'ETH',
            'decimals': 18,
            'name': 'Ether',
            'coingeckoId': 'base',
            'aggregators': [

            ],
            'occurrences': 100,
            'iconUrl': 'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/8453/native/8453.png',
            'metadata': {
              'honeypotStatus': {

              },
              'erc20Permit': false,
              'createdAt': '2023-10-31T21:47:47.414Z'
            }
          },
          'srcAmount': '991250000000000000',
          'destAmount': '991167421942812774'
        }
      ],
      'bridgePriceData': {
        'totalFromAmountUsd': '1849.7584',
        'totalToAmountUsd': '1849.6043',
        'priceImpact': '0.00008330817689486976'
      }
    },
    'trade': {
      'chainId': 1,
      'to': '0x0439e60F02a8900a951603950d8D4527f400C3f1',
      'from': '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3',
      'value': '0x0de0b6b3a7640000',
      'data': '0x3ce33bff000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000000d6c6966694164617074657256320000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001e000000000000000000000000021a786957c69424a4353afe743242bd9db3cc07b00000000000000000000000021a786957c69424a4353afe743242bd9db3cc07b0000000000000000000000000000000000000000000000000000000000002105000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000dc1a09f859b20000000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000001f161421c8e000000000000000000000000000e6b738da243e8fa2a0ed5915645789add5de5152000000000000000000000000000000000000000000000000000000000000008cdf834e1553971be5e80a63d476cf1cdd1fcc252442b50d6e97207228aa4aefc376cf1cdd1fcc252442b50d6e97207228aa4aefc30000210542000000000000000000000000000000000000060000000000000000000000000000000000000000000000000dc15562d2e69cad00000000000000000000000000000000000000006813a4636813c871000000000000000000000000000000000000000000000000c924e9c70b5957c8d08fc6caacc5aa8245f24e00c2dcc2a54afbceeda5353ada710f91c60b1207f7780341b41c4af04d3b8987511f5a52357ac282db6e2790e01c',
      'gasLimit': 158889
    },
    'estimatedProcessingTimeInSeconds': 18
  },
];
