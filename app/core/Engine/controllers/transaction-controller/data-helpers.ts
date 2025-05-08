import { merge } from 'lodash';

export const enabledSmartTransactionsState = {
  engine: {
    backgroundState: {
      SmartTransactionsController: {
        enabled: true,
        smartTransactionsState: {
          liveness: true,
        },
      },
      AccountsController: {
        internalAccounts: {
          selectedAccount: 'account1',
          accounts: {
            account1: {
              address: '0x123',
            },
          },
        },
      },
      NetworkController: {
        selectedNetworkClientId: 'mainnet',
        networkConfigurationsByChainId: {
          '0x1': {
            chainId: '0x1',
            rpcEndpoints: [
              {
                networkClientId: 'mainnet',
                type: 'infura',
                url: 'https://mainnet.infura.io/v3/{infuraProjectId}',
              },
            ],
            defaultRpcEndpointIndex: 0,
            nativeCurrency: 'ETH',
          },
        },
      },
      PreferencesController: {
        smartTransactionsOptInStatus: true,
      },
    },
  },
  swaps: {
    featureFlags: {
      smart_transactions: {
        mobile_active: true,
      },
      smartTransactions: {
        mobileActive: true,
      },
    },
  },
  selectedAccount: {
    address: '0x1234567890123456789012345678901234567890',
  },
};

export const disabledSmartTransactionsState = merge(
  {},
  enabledSmartTransactionsState,
  {
    engine: {
      backgroundState: {
        PreferencesController: {
          smartTransactionsOptInStatus: false,
        },
      },
    },
  },
);
