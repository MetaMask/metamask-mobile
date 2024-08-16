import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import Tabs from './';
import { backgroundState } from '../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';

const mockInitialState = {
  wizard: {
    step: 1,
  },
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 1, right: 2, bottom: 3, left: 4 };
  return {
    SafeAreaInsetsContext: {
      Consumer: jest.fn().mockImplementation(({ children }) => children(inset)),
    },
  };
});

jest.mock('../../../core/Engine', () => ({
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
  },
}));

describe('Tabs', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <Tabs tabs={[{ id: 1, url: 'about:blank', image: '' }]} />,
      { state: mockInitialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
