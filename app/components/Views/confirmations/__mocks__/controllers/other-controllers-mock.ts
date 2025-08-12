import { merge } from 'lodash';

const accountMock = '0xdc47789de4ceff0e8fe9d15d728af7f17550c164';

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
        accountsByChainId: {},
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
        tokenBalances: {},
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
);
