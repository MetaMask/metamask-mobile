import { CHAIN_IDS } from '@metamask/transaction-controller';
import { mockNetworkState } from '../../util/test/network';
import { NetworkClientId } from '@metamask/network-controller';
import Engine from '../../core/Engine';
import { MOCK_KEYRING_CONTROLLER_STATE } from '../../util/test/keyringControllerTestUtils';

export const mockedEngine = {
  init: () => Engine.init({}),
  controllerMessenger: {
    subscribeOnceIf: jest.fn(),
    subscribe: jest.fn(),
    call: jest.fn().mockImplementation((method) => {
      if (method === 'SelectedNetworkController:getNetworkClientIdForDomain') {
        return 'mainnet';
      }

      if (method === 'NetworkController:getNetworkClientById') {
        return {
          configuration: {
            chainId: '0x1',
            ticker: 'ETH',
          },
        };
      }
    }),
  },
  datamodel: {
    state: { PreferencesController: { selectedAddress: '' } },
  },
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
    ApprovalController: {
      addAndShowApprovalRequest: jest.fn(),
    },
    PermissionController: {
      createPermissionMiddleware: jest.fn(),
      requestPermissions: jest.fn(),
      getCaveat: jest.fn(),
      updateCaveat: jest.fn(),
      revokePermission: jest.fn(),
      revokePermissions: jest.fn(),
      getPermissions: jest.fn(),
      hasPermissions: jest.fn(),
      hasPermission: jest.fn(),
      executeRestrictedMethod: jest.fn(),
      state: {
        subjects: {},
      },
    },
    SelectedNetworkController: {
      getProviderAndBlockTracker: jest.fn(),
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
  getCaip25PermissionFromLegacyPermissions: jest.fn(),
};

export default mockedEngine;
