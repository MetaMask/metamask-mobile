#!/usr/bin/env node

/**
 * Fixture Server for MetaMask Mobile Maestro Tests
 * Provides pre-configured wallet state to skip onboarding
 */

import * as http from 'http';
import * as fs from 'fs';

interface FixtureState {
  engine: {
    backgroundState: {
      [key: string]: any;
    };
  };
}

// Pre-configured fixture state matching FixtureBuilder setup
const FIXTURE_STATE: FixtureState = {
  "engine": {
    "backgroundState": {
      "AccountsController": {
        "internalAccounts": {
          "accounts": {
            "cf8dace4-9439-4bd4-b3a8-88c821c8fcb3": {
              "address": "0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3",
              "id": "cf8dace4-9439-4bd4-b3a8-88c821c8fcb3",
              "metadata": {
                "name": "Test Account",
                "keyring": {
                  "type": "HD Key Tree"
                }
              },
              "options": {},
              "methods": [
                "personal_sign",
                "eth_sign",
                "eth_signTransaction",
                "eth_signTypedData_v1",
                "eth_signTypedData_v3",
                "eth_signTypedData_v4"
              ],
              "type": "eip155:eoa"
            }
          },
          "selectedAccount": "cf8dace4-9439-4bd4-b3a8-88c821c8fcb3"
        }
      },
      "NetworkController": {
        "selectedNetworkClientId": "mainnet",
        "networkConfigurations": {},
        "networksMetadata": {
          "mainnet": {
            "EIPS": {
              "1559": true
            },
            "status": "available"
          }
        }
      },
      "PerpsController": {
        "isFirstTimeUser": {
          "testnet": false,
          "mainnet": false
        }
      },
      "PreferencesController": {
        "selectedAddress": "0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3",
        "identities": {
          "0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3": {
            "name": "Test Account",
            "address": "0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3"
          }
        },
        "useTokenDetection": true,
        "useNftDetection": false,
        "displayNftMedia": true,
        "useSafeChainsListValidation": true,
        "isMultiAccountBalancesEnabled": true,
        "disabledRpcMethodPreferences": {
          "eth_sign": false
        },
        "dismissedPromotionalBanners": {
          "perps": true,
          "perpsAnnouncement": true
        },
        "smartTransactionsOptInStatus": false
      },
      "KeyringController": {
        "isUnlocked": true,
        "keyrings": [
          {
            "type": "HD Key Tree",
            "accounts": ["0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3"]
          }
        ]
      },
      "TokensController": {
        "tokens": [],
        "ignoredTokens": [],
        "detectedTokens": [],
        "allTokens": {
          "0x1": {
            "0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3": []
          }
        },
        "allIgnoredTokens": {
          "0x1": {
            "0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3": []
          }
        },
        "allDetectedTokens": {
          "0x1": {
            "0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3": []
          }
        }
      },
      "TransactionController": {
        "transactions": {},
        "methodData": {},
        "lastFetchedBlockNumbers": {}
      },
      "SmartTransactionsController": {
        "smartTransactionsState": {
          "smartTransactions": {
            "1": []
          },
          "userOptIn": false,
          "fees": {
            "approvalTxFees": {},
            "tradeTxFees": {}
          },
          "feesByChainId": {
            "1": {
              "approvalTxFees": {},
              "tradeTxFees": {}
            }
          }
        }
      },
      "SwapsController": {
        "quotes": {},
        "quoteValues": {},
        "fetchParams": null,
        "tokens": null,
        "topAggId": null,
        "aggregatorMetadata": null,
        "tokensWithBalances": null,
        "balanceError": false,
        "topAssets": null,
        "approvalTransaction": null,
        "aggregatorMetadataLastFetched": 0,
        "quotesLastFetched": 0,
        "topAssetsLastFetched": 0,
        "error": {
          "key": null,
          "description": null
        },
        "topAggSavings": null,
        "customApproveTxData": null,
        "customGasPrice": null,
        "customMaxGas": null,
        "customMaxFeePerGas": null,
        "customMaxPriorityFeePerGas": null,
        "swapsFeatureIsLive": false,
        "swapsQuoteRefreshTime": 60000,
        "swapsQuotePrefetchingRefreshTime": 60000,
        "swapsStxBatchStatusRefreshTime": 10000,
        "swapsStxGetTransactionsRefreshTime": 10000,
        "swapsStxMaxFeeMultiplier": 2,
        "swapsUserFeeLevel": "medium",
        "saveFetchedQuotes": false,
        "swapsFromToken": null,
        "customGasLimit": null,
        "customGasLimitForApprovalTx": null,
        "swapsChainId": "0x1"
      },
      "MetaMetricsController": {
        "metaMetricsId": "test-metrics-id",
        "participateInMetaMetrics": true,
        "dataCollectionForMarketing": true
      },
      "GasFeeController": {
        "gasFeeEstimates": {
          "low": {
            "minWaitTimeEstimate": 15000,
            "maxWaitTimeEstimate": 30000,
            "suggestedMaxPriorityFeePerGas": "1",
            "suggestedMaxFeePerGas": "20"
          },
          "medium": {
            "minWaitTimeEstimate": 15000,
            "maxWaitTimeEstimate": 45000,
            "suggestedMaxPriorityFeePerGas": "2",
            "suggestedMaxFeePerGas": "25"
          },
          "high": {
            "minWaitTimeEstimate": 15000,
            "maxWaitTimeEstimate": 60000,
            "suggestedMaxPriorityFeePerGas": "3",
            "suggestedMaxFeePerGas": "30"
          },
          "estimatedBaseFee": "15"
        },
        "estimatedGasFeeTimeBounds": {},
        "gasEstimateType": "fee-market"
      }
    }
  }
};

// Create HTTP server
const server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Serve fixture state
  if (req.url === '/state.json' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(FIXTURE_STATE));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

// Start server
const PORT = process.env.FIXTURE_SERVER_PORT || 12345;
server.listen(PORT, () => {
  // Write PID file for cleanup
  fs.writeFileSync('/tmp/metamask-fixture-server.pid', process.pid.toString());
});

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
