import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import DrawerView from './';

import { backgroundState } from '../../../util/test/initial-root-state';
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

jest.mock('../../../core/Engine', () => ({
  init: () => mockedEngine.init({}),
  getTotalFiatAccountBalance: () => ({ ethFiat: 0, tokenFiat: 0 }),
  context: {
    NetworkController: {
      getNetworkClientById: () => ({
        configuration: {
          rpcUrl: 'https://mainnet.infura.io/v3',
          chainId: '0x1',
          ticker: 'ETH',
          nickname: 'Ethereum mainnet',
          rpcPrefs: {
            blockExplorerUrl: 'https://etherscan.com',
          },
        },
      }),
      state: {
        networkConfigurations: {
          '673a4523-3c49-47cd-8d48-68dfc8a47a9c': {
            id: '673a4523-3c49-47cd-8d48-68dfc8a47a9c',
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
    KeyringController: {
      state: {
        keyrings: [],
      },
    },
  },
}));

describe('DrawerView', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <DrawerView navigation={{ goBack: () => null }} />,
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
