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
        ticker={''}
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
        ticker={''}
      />,
      { state: nonEvmState },
    );
    expect(wrapper).toMatchSnapshot();
  });
});
