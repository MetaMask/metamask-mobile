import { CHAIN_IDS } from '@metamask/transaction-controller';
import { mockNetworkState } from '../../util/test/network';
import { NetworkClientId } from '@metamask/network-controller';
import Engine from '../../core/Engine';
import { MOCK_KEYRING_CONTROLLER_STATE } from '../../util/test/keyringControllerTestUtils';

export const mockedEngine = {
  init: () => Engine.init({}),
  context: {
    KeyringController: {
      ...MOCK_KEYRING_CONTROLLER_STATE,
      isUnlocked: () => true,
      setLocked: jest.fn(),
      createNewVaultAndRestore: jest.fn(),
      createNewVaultAndKeychain: jest.fn(),
    },
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
  resetState: jest.fn(),
};

export default mockedEngine;
