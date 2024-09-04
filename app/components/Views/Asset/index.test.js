import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import Asset from './';
import Engine from '../../../core/Engine';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';

const mockedEngine = Engine;

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

jest.mock('../../../core/Engine.ts', () => {
  const {
    MOCK_ADDRESS_1,
  } = require('../../../util/test/accountsControllerTestUtils');

  return {
    init: () => mockedEngine.init({}),
    context: {
      KeyringController: {
        getOrAddQRKeyring: async () => ({ subscribe: () => ({}) }),
        state: {
          keyrings: [
            {
              accounts: [MOCK_ADDRESS_1],
            },
          ],
        },
      },
      NetworkController: {
        getNetworkClientById: () => ({
          configuration: {
            chainId: '0x1',
          },
        }),
        state: {
          networkConfigurations: {
            mainnet: {
              id: 'mainnet',
              rpcUrl: 'https://mainnet.infura.io/v3',
              chainId: '0x1',
              ticker: 'ETH',
              nickname: 'Ethereum mainnet',
              rpcPrefs: {
                blockExplorerUrl: 'https://etherscan.com',
              },
            },
          },
          selectedNetworkClientId: '673a4523-3c49-47cd-8d48-68dfc8a47a9c',
          networkMetadata: {},
        },
      },
    },
    controllerMessenger: {
      subscribe: jest.fn(),
    },
  };
});

describe('Asset', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <Asset
        navigation={{ setOptions: () => null }}
        route={{ params: { symbol: 'ETH', address: 'something', isETH: true } }}
        transactions={[]}
      />,
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
