import { merge } from 'lodash';
import { toHex } from '@metamask/controller-utils';
import { PredictPositionStatus } from '../../../../UI/Predict/types';

export const accountMock = '0xdc47789de4ceff0e8fe9d15d728af7f17550c164';
export const tokenAddress1Mock = '0x1234567890abcdef1234567890abcdef12345678';
export const tokenAddress2Mock = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef';

export const keyringControllerMock = {
  engine: {
    backgroundState: {
      KeyringController: {
        vault: undefined,
        isUnlocked: false,
        keyrings: [],
        encryptionKey: undefined,
        encryptionSalt: undefined,
      },
    },
  },
};

export const accountsControllerMock = {
  engine: {
    backgroundState: {
      AccountsController: {
        internalAccounts: {
          accounts: {
            [accountMock]: {
              address: accountMock,
              metadata: {
                name: 'Account 1',
                keyring: {
                  type: 'HD Key Tree',
                },
              },
            },
          },
          selectedAccount: accountMock,
        },
      },
    },
  },
};

export const accountTrackerControllerMock = {
  engine: {
    backgroundState: {
      AccountTrackerController: {
        accountsByChainId: {
          '0x1': {
            [accountMock]: {
              balance: toHex(2 * 10 ** 18),
            },
          },
        },
      },
    },
  },
};

export const multichainNetworkControllerMock = {
  engine: {
    backgroundState: {
      MultichainNetworkController: {
        multichainNetworkConfigurationsByChainId: {},
        selectedMultichainNetworkChainId: undefined,
        isEvmSelected: true,
        networksWithTransactionActivity: {},
      },
    },
  },
};

export const tokenBalancesControllerMock = {
  engine: {
    backgroundState: {
      TokenBalancesController: {
        tokenBalances: {
          [accountMock]: {
            '0x1': {
              [tokenAddress1Mock]: '0x64', // 100
              '0x1234567890AbcdEF1234567890aBcdef12345678': '0x64',
            },
          },
        },
      },
    },
  },
};

export const networkControllerMock = {
  engine: {
    backgroundState: {
      NetworkController: {
        networksMetadata: {
          mainnet: {
            EIPS: { 1559: true },
          },
        },
        networkConfigurationsByChainId: {
          '0x1': {
            nativeCurrency: 'ETH',
            rpcEndpoints: [
              {
                networkClientId: 'mainnet',
                url: 'https://mainnet.infura.io/v3/1234567890',
              },
            ],
            defaultRpcEndpointIndex: 0,
          },
        },
        selectedNetworkClientId: 'mainnet',
      },
    },
  },
};

export const currencyRateControllerMock = {
  engine: {
    backgroundState: {
      CurrencyRateController: {
        currentCurrency: 'usd',
        currencyRates: {
          ETH: {
            conversionDate: 1732887955.694,
            conversionRate: 10000,
            usdConversionRate: 10000,
          },
        },
      },
    },
  },
};

export const nftControllerMock = {
  engine: {
    backgroundState: {
      NftController: {
        allNftContracts: {},
      },
    },
  },
};

export const swapsState = {
  swaps: {
    featureFlags: {
      smartTransactions: {
        mobileActive: false,
      },
    },
  },
};

export const smartTransactionsControllerMock = {
  engine: {
    backgroundState: {
      SmartTransactionsController: {
        smartTransactionsState: {
          liveness: false,
        },
      },
    },
  },
};

export const preferencesControllerMock = {
  engine: {
    backgroundState: {
      PreferencesController: {
        useTransactionSimulations: false,
      },
    },
  },
};

export const tokensControllerMock = {
  engine: {
    backgroundState: {
      TokensController: {
        allTokens: {
          '0x1': {
            [accountMock]: [
              {
                address: tokenAddress1Mock,
                chainId: '0x1',
                decimals: 4,
                symbol: 'T1',
              },
              {
                address: tokenAddress2Mock,
                chainId: '0x1',
                decimals: 6,
                symbol: 'T2',
              },
            ],
          },
        },
      },
    },
  },
};

export const tokenListControllerMock = {
  engine: {
    backgroundState: {
      TokenListController: {
        tokensChainsCache: {
          '0x1': {},
        },
      },
    },
  },
};

export const tokenRatesControllerMock = {
  engine: {
    backgroundState: {
      TokenRatesController: {
        marketData: {},
      },
    },
  },
};

export const gasFeeControllerMock = {
  engine: {
    backgroundState: {
      GasFeeController: {
        gasFeeEstimates: {},
      },
    },
  },
};

export const predictControllerMock = {
  engine: {
    backgroundState: {
      PredictController: {
        claimablePositions: {
          [accountMock]: [
            {
              id: 'position-1',
              providerId: 'polymarket',
              marketId: 'market-1',
              outcomeId: 'outcome-1',
              outcomeTokenId: 'token-1',
              outcome: 'Yes',
              title: 'Market 1',
              icon: 'https://example.com/icon1.png',
              amount: 100,
              price: 1.0,
              status: PredictPositionStatus.WON,
              size: 100,
              outcomeIndex: 0,
              realizedPnl: 0,
              curPrice: 1.5,
              conditionId: 'condition-1',
              percentPnl: 50,
              cashPnl: 50,
              initialValue: 100,
              avgPrice: 1.0,
              currentValue: 150,
              endDate: '2025-01-01',
              claimable: true,
              redeemable: true,
              negRisk: false,
            },
            {
              id: 'position-2',
              providerId: 'polymarket',
              marketId: 'market-2',
              outcomeId: 'outcome-2',
              outcomeTokenId: 'token-2',
              outcome: 'No',
              title: 'Market 2',
              icon: 'https://example.com/icon2.png',
              amount: 200,
              price: 1.2,
              status: PredictPositionStatus.WON,
              size: 200,
              outcomeIndex: 1,
              realizedPnl: 0,
              curPrice: 1.8,
              conditionId: 'condition-2',
              percentPnl: 50,
              cashPnl: 100,
              initialValue: 200,
              avgPrice: 1.2,
              currentValue: 300,
              endDate: '2025-01-02',
              claimable: true,
              redeemable: true,
              negRisk: false,
            },
            {
              id: 'position-3',
              providerId: 'polymarket',
              marketId: 'market-3',
              outcomeId: 'outcome-3',
              outcomeTokenId: 'token-3',
              outcome: 'Yes',
              title: 'Market 3',
              icon: 'https://example.com/icon3.png',
              amount: 300,
              price: 0.8,
              status: PredictPositionStatus.WON,
              size: 300,
              outcomeIndex: 0,
              realizedPnl: 0,
              curPrice: 1.2,
              conditionId: 'condition-3',
              percentPnl: 50,
              cashPnl: 150,
              initialValue: 300,
              avgPrice: 0.8,
              currentValue: 450,
              endDate: '2025-01-03',
              claimable: true,
              redeemable: true,
              negRisk: false,
            },
            {
              id: 'position-4',
              providerId: 'polymarket',
              marketId: 'market-4',
              outcomeId: 'outcome-4',
              outcomeTokenId: 'token-4',
              outcome: 'No',
              title: 'Market 4',
              icon: 'https://example.com/icon4.png',
              amount: 400,
              price: 0.9,
              status: PredictPositionStatus.WON,
              size: 400,
              outcomeIndex: 1,
              realizedPnl: 0,
              curPrice: 1.4,
              conditionId: 'condition-4',
              percentPnl: 55,
              cashPnl: 200,
              initialValue: 400,
              avgPrice: 0.9,
              currentValue: 600,
              endDate: '2025-01-04',
              claimable: true,
              redeemable: true,
              negRisk: false,
            },
            {
              id: 'position-5',
              providerId: 'polymarket',
              marketId: 'market-5',
              outcomeId: 'outcome-5',
              outcomeTokenId: 'token-5',
              outcome: 'Yes',
              title: 'Market 5',
              icon: 'https://example.com/icon5.png',
              amount: 500,
              price: 1.1,
              status: PredictPositionStatus.WON,
              size: 500,
              outcomeIndex: 0,
              realizedPnl: 0,
              curPrice: 1.6,
              conditionId: 'condition-5',
              percentPnl: 45,
              cashPnl: 250,
              initialValue: 500,
              avgPrice: 1.1,
              currentValue: 750,
              endDate: '2025-01-05',
              claimable: true,
              redeemable: true,
              negRisk: false,
            },
          ],
        },
      },
    },
  },
};

export const otherControllersMock = merge(
  {},
  accountsControllerMock,
  accountTrackerControllerMock,
  currencyRateControllerMock,
  keyringControllerMock,
  networkControllerMock,
  multichainNetworkControllerMock,
  nftControllerMock,
  preferencesControllerMock,
  tokenBalancesControllerMock,
  swapsState,
  smartTransactionsControllerMock,
  preferencesControllerMock,
  tokenListControllerMock,
  tokenRatesControllerMock,
  tokensControllerMock,
  gasFeeControllerMock,
  predictControllerMock,
);
