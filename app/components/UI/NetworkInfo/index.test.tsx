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
        type={''}
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
        type={''}
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
            providerConfig: {
              ...backgroundState.NetworkController
                .networkConfigurationsByChainId['0x1'],
              ticker: undefined,
              rpcUrl: 'https://custom-rpc.example.com',
            },
          },
        },
      },
    };

    const wrapper = renderWithProvider(
      <NetworkInfo
        type={''}
        onClose={function (): void {
          throw new Error('Function not implemented.');
        }}
      />,
      { state: evmStateWithoutTicker },
    );
    expect(wrapper).toMatchSnapshot();
  });
});
