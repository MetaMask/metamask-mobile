import React from 'react';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { ChainId } from '@metamask/controller-utils';
import { render } from '@testing-library/react-native';

import NetworkMainAssetLogo from '.';
import { backgroundState } from '../../../util/test/initial-root-state';

jest.mock('../Swaps/components/TokenIcon', () => {
  const originalModule = jest.requireActual('../Swaps/components/TokenIcon');
  return {
    ...originalModule,
    __esModule: true,
    default: jest.fn(({ symbol }) => symbol),
  };
});

const mockInitialState = {
  engine: {
    backgroundState,
  },
  network: {
    provider: {
      chainId: ChainId.mainnet,
      ticker: 'ETH',
    },
  },
};

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

describe('NetworkMainAssetLogo', () => {
  const mockStore = configureMockStore();
  const store = mockStore(mockInitialState);

  it('should renders correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <NetworkMainAssetLogo />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
