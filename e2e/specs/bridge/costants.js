export const ETH_TO_BASE_URL = 'https://bridge.api.cx.metamask.io/getQuote?walletAddress=0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3&destWalletAddress=0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3&srcChainId=1&destChainId=8453&srcTokenAddress=0x0000000000000000000000000000000000000000&destTokenAddress=0x0000000000000000000000000000000000000000&srcTokenAmount=1000000000000000000&insufficientBal=false&resetApproval=false&slippage=0.5';
        //                        https://bridge.api.cx.metamask.io/getQuote?walletAddress=0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3&destWalletAddress=0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3&srcChainId=1&destChainId=8453&srcTokenAddress=0x0000000000000000000000000000000000000000&destTokenAddress=0x0000000000000000000000000000000000000000&srcTokenAmount=1000000000000000000&insufficientBal=false&resetApproval=false&slippage=0.5
//                   https://bridge.api.cx.metamask.io/getQuote?walletAddress=0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3&destWalletAddress=0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3&srcChainId=1&destChainId=8453&srcTokenAddress=0x0000000000000000000000000000000000000000&destTokenAddress=0x0000000000000000000000000000000000000000&srcTokenAmount=1000000000000000000&insufficientBal=true&resetApproval=false&slippage=0.5
export const ETH_TO_BASE_RESPONSE = [
  {
    "quote": {
      "bridgeId": "lifi",
      "requestId": "0x600e713627450d75a62292a1d97c8069c7c10932622e8fe1ea909d0eef263378",
      "aggregator": "lifi",
      "srcChainId": 1,
      "srcTokenAmount": "991250000000000000",
      "srcAsset": {
        "address": "0x0000000000000000000000000000000000000000",
        "chainId": 1,
        "assetId": "eip155:1/slip44:60",
        "symbol": "ETH",
        "decimals": 18,
        "name": "Ethereum",
        "coingeckoId": "ethereum",
        "aggregators": [],
        "occurrences": 100,
        "iconUrl": "https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/slip44/60.png",
        "metadata": {
          "honeypotStatus": {},
          "isContractVerified": false,
          "erc20Permit": false,
          "description": {},
          "createdAt": "2023-10-31T22:41:58.553Z"
        },
        "price": "2420.678586"
      },
      "destChainId": 8453,
      "destTokenAmount": "991237292213186874",
      "destAsset": {
        "address": "0x0000000000000000000000000000000000000000",
        "chainId": 8453,
        "assetId": "eip155:8453/slip44:8453",
        "symbol": "ETH",
        "decimals": 18,
        "name": "Ether",
        "coingeckoId": "base",
        "aggregators": [],
        "occurrences": 100,
        "iconUrl": "https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/8453/slip44/8453.png",
        "metadata": {
          "honeypotStatus": {},
          "erc20Permit": false,
          "createdAt": "2023-10-31T21:47:47.414Z"
        },
        "price": "2420.678586"
      },
      "feeData": {
        "metabridge": {
          "amount": "8750000000000000",
          "asset": {
            "address": "0x0000000000000000000000000000000000000000",
            "chainId": 1,
            "assetId": "eip155:1/slip44:60",
            "symbol": "ETH",
            "decimals": 18,
            "name": "Ethereum",
            "coingeckoId": "ethereum",
            "aggregators": [],
            "occurrences": 100,
            "iconUrl": "https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/slip44/60.png",
            "metadata": {
              "honeypotStatus": {},
              "isContractVerified": false,
              "erc20Permit": false,
              "description": {},
              "createdAt": "2023-10-31T22:41:58.553Z"
            },
            "price": "2420.678586"
          }
        }
      },
      "bridges": [
        "relay"
      ],
      "steps": [
        {
          "action": "bridge",
          "srcChainId": 1,
          "destChainId": 8453,
          "protocol": {
            "name": "relay",
            "displayName": "Relay",
            "icon": "https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/bridges/relay.svg"
          },
          "srcAsset": {
            "address": "0x0000000000000000000000000000000000000000",
            "chainId": 1,
            "assetId": "eip155:1/slip44:60",
            "symbol": "ETH",
            "decimals": 18,
            "name": "Ethereum",
            "coingeckoId": "ethereum",
            "aggregators": [],
            "occurrences": 100,
            "iconUrl": "https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/slip44/60.png",
            "metadata": {
              "honeypotStatus": {},
              "isContractVerified": false,
              "erc20Permit": false,
              "description": {},
              "createdAt": "2023-10-31T22:41:58.553Z"
            }
          },
          "destAsset": {
            "address": "0x0000000000000000000000000000000000000000",
            "chainId": 8453,
            "assetId": "eip155:8453/slip44:8453",
            "symbol": "ETH",
            "decimals": 18,
            "name": "Ether",
            "coingeckoId": "base",
            "aggregators": [],
            "occurrences": 100,
            "iconUrl": "https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/8453/slip44/8453.png",
            "metadata": {
              "honeypotStatus": {},
              "erc20Permit": false,
              "createdAt": "2023-10-31T21:47:47.414Z"
            }
          },
          "srcAmount": "991250000000000000",
          "destAmount": "991237292213186874"
        }
      ],
      "priceData": {
        "totalFromAmountUsd": "2408.95",
        "totalToAmountUsd": "2387.6329152455914",
        "priceImpact": "0.008849118808779083"
      }
    },
    "trade": {
      "chainId": 1,
      "to": "0x0439e60F02a8900a951603950d8D4527f400C3f1",
      "from": "0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3",
      "value": "0x0de0b6b3a7640000",
      "data": "0x3ce33bff000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000000d6c6966694164617074657256320000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004600000000000000000000000001231deb6f5749ef6ce6943a275a1d3e7486f4eae0000000000000000000000001231deb6f5749ef6ce6943a275a1d3e7486f4eae0000000000000000000000000000000000000000000000000000000000002105000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000dc1a09f859b20000000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000001f161421c8e000000000000000000000000000e6b738da243e8fa2a0ed5915645789add5de51520000000000000000000000000000000000000000000000000000000000000304ae328590000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000002009cf9dceb2f716c1b015a3baf6875317e98a33e9db406ac9573c89b8a1847729b000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000076cf1cdd1fcc252442b50d6e97207228aa4aefc30000000000000000000000000000000000000000000000000dc1a09f859b2000000000000000000000000000000000000000000000000000000000000000210500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000572656c6179000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000f6d6574616d61736b2d6272696467650000000000000000000000000000000000c308dddf5a31b33ee3a9339a15e975b78f7c476d5c1ff05e93db340bfbfaf78600000000000000000000000076cf1cdd1fcc252442b50d6e97207228aa4aefc300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000004189976b5f32ac9b618ebcffa72a6ddbd2bc29c16479b10d5fe9315a95e36611ea7974434a7e5d148c13a798987eb0fca6a382c4d8bb8d559ddb605b1ca5ea11941b0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000f1dfe19a025d0d89cb78562fc890e90f5341d1612e7e7ac20a6bc57b9cd51a955648822344a3c72d9e1b6e98c0fb41de4af644c35b396993c60cc4ddc1797e921c",
      "gasLimit": 209791
    },
    "estimatedProcessingTimeInSeconds": 24
  },
];
