import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import NavbarBrowserTitle from './';
import { backgroundState } from '../../../util/test/initial-root-state';
import Engine from '../../../core/Engine';

const mockedEngine = Engine;

const mockInitialState = {
  engine: {
    backgroundState,
  },
};

jest.mock('../../../core/Engine', () => ({
  init: () => mockedEngine.init({}),
  context: {
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
        selectedNetworkClientId: 'mainnet',
        networkMetadata: {},
      },
    },
  },
}));

describe('NavbarBrowserTitle', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <NavbarBrowserTitle hostname={'faucet.metamask.io'} https />,
      { state: mockInitialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
