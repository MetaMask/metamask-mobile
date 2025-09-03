import { merge } from 'lodash';

/**
 * Minimal state mock for Perps components
 * Similar to the controller mocks used in confirmations
 */

export const perpsEngineStateMock = {
  engine: {
    backgroundState: {
      NetworkController: {
        providerConfig: {
          chainId: '0x1',
          type: 'mainnet',
        },
        selectedNetworkClientId: 'mainnet',
      },
      AccountsController: {
        internalAccounts: {
          selectedAccount: 'account1',
          accounts: {
            account1: {
              id: 'account1',
              address: '0x1234567890abcdef',
              metadata: {
                name: 'Account 1',
              },
            },
          },
        },
      },
      TokenListController: {
        tokensChainsCache: {},
      },
      PreferencesController: {
        selectedAddress: '0x1234567890abcdef',
        useTokenDetection: true,
        ipfsGateway: 'https://ipfs.io',
      },
    },
  },
};

export const perpsSettingsStateMock = {
  settings: {
    showHexData: false,
  },
};

/**
 * Create a complete state mock for Perps tests
 * Can be customized with overrides
 */
export const createPerpsStateMock = (overrides = {}) =>
  merge({}, perpsEngineStateMock, perpsSettingsStateMock, overrides);
