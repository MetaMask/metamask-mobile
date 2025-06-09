import React from 'react';
import NetworkInfo from './';

import { backgroundState } from '../../../util/test/initial-root-state';
import renderWithProvider from '../../../util/test/renderWithProvider';

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

const initialState = {
  privacy: {
    approvedHosts: {},
  },
  engine: {
    backgroundState,
  },
};

describe('NetworkInfo', () => {
  it('render correctly', () => {
    const wrapper = renderWithProvider(
      <NetworkInfo
        onClose={function (): void {
          throw new Error('Function not implemented.');
        }}
      />,
      { state: initialState },
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('render correctly with non-EVM selected', () => {
    const nonEvmState = {
      ...initialState,
      engine: {
        backgroundState: {
          ...backgroundState,
          MultichainNetworkController: {
            ...backgroundState.MultichainNetworkController,
            isEvmSelected: false,
          },
        },
      },
    };

    const wrapper = renderWithProvider(
      <NetworkInfo
        onClose={function (): void {
          throw new Error('Function not implemented.');
        }}
      />,
      { state: nonEvmState },
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('render correctly with EVM network without ticker', () => {
    const evmStateWithoutTicker = {
      ...initialState,
      engine: {
        backgroundState: {
          ...backgroundState,
          NetworkController: {
            ...backgroundState.NetworkController,
            networkConfigurationsByChainId: {
              '0x123': {
                blockExplorerUrls: [],
                chainId: '0x123',
                defaultRpcEndpointIndex: 0,
                name: 'Custom mainnet',
                nativeCurrency: undefined,
                rpcEndpoints: [
                  {
                    networkClientId: 'mainnet',
                    type: 'custom',
                    url: 'https://mainnet.infura.io/v3/{infuraProjectId}',
                  },
                ],
              },
            },
          },
        },
      },
    };

    const wrapper = renderWithProvider(
      <NetworkInfo
        onClose={function (): void {
          throw new Error('Function not implemented.');
        }}
      />,
      // @ts-expect-error - we do want to test the ticker be undefined on this unit test
      { state: evmStateWithoutTicker },
    );
    expect(wrapper).toMatchSnapshot();
  });
});
