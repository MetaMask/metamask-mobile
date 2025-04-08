import { CHAIN_IDS } from '@metamask/transaction-controller';
import { mockNetworkState } from '../../util/test/network';
import { NetworkClientId } from '@metamask/network-controller';
import Engine from '../../core/Engine';
import { MOCK_KEYRING_CONTROLLER_STATE } from '../../util/test/keyringControllerTestUtils';

export const mockedEngine = {
  init: () => Engine.init({}),
  context: {
    AccountsController: {
      listAccounts: jest.fn(),
      getSelectedAccount: jest.fn(),
    },
    AccountTrackerController: {
      state: {
        accounts: {},
      },
    },
    PermissionController: {
      requestPermissions: jest.fn(),
      getCaveat: jest.fn(),
      updateCaveat: jest.fn(),
      revokePermission: jest.fn(),
      state: {
        subjects: {},
      },
    },
    KeyringController: MOCK_KEYRING_CONTROLLER_STATE,
    NetworkController: {
      getNetworkClientById: (networkClientId: NetworkClientId) => {
        if (networkClientId === 'linea_goerli') {
          return {
            configuration: {
              chainId: '0xe704',
              rpcUrl: 'https://linea-goerli.infura.io/v3',
              ticker: 'LINEA',
              type: 'custom',
            },
          };
        }

        return {
          configuration: {
            chainId: '0x1',
            rpcUrl: 'https://mainnet.infura.io/v3',
            ticker: 'ETH',
            type: 'custom',
          },
        };
      },
      removeNetwork: () => ({}),
      state: {
        ...mockNetworkState({
          chainId: CHAIN_IDS.MAINNET,
          id: 'mainnet',
          nickname: 'Ethereum Mainnet',
          ticker: 'ETH',
        }),
      },
    },
  },
  hasFunds: jest.fn(),
};

export default mockedEngine;
