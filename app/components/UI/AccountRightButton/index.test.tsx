import React from 'react';
import {
  DeepPartial,
  renderScreen,
} from '../../../util/test/renderWithProvider';
import AccountRightButton from './';
import { backgroundState } from '../../../util/test/initial-root-state';
import { RootState } from '../../../reducers';
import { mockNetworkState } from '../../../util/test/network';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { SolScope } from '@metamask/keyring-api';

const mockInitialState: DeepPartial<RootState> = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      NetworkController: {
        ...mockNetworkState({
          id: 'mainnet',
          nickname: 'Ethereum Mainnet',
          ticker: 'ETH',
          chainId: CHAIN_IDS.MAINNET,
        }),
      },
      SelectedNetworkController: {
        domains: {},
      },
      MultichainNetworkController: {
        ...backgroundState.MultichainNetworkController,
        isEvmSelected: true,
        selectedMultichainNetworkChainId: SolScope.Mainnet,
        multichainNetworkConfigurationsByChainId: {
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
            name: 'Solana Mainnet',
            nativeCurrency: 'solana:sol/token:sol',
          },
        },
      },
    },
  },
};

describe('AccountRightButton', () => {
  it('should render correctly', () => {
    const { toJSON } = renderScreen(
      () => (
        <AccountRightButton selectedAddress="0x123" onPress={() => undefined} />
      ),
      {
        name: 'AccountRightButton',
      },
      { state: mockInitialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render correctly when a EVM network is selected', () => {
    const { toJSON } = renderScreen(
      () => (
        <AccountRightButton selectedAddress="0x123" onPress={() => undefined} />
      ),
      {
        name: 'AccountRightButton',
      },
      { state: mockInitialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render correctly when a non-EVM network is selected', () => {
    const mockInitialStateNonEvm = {
      ...mockInitialState,
      engine: {
        ...mockInitialState.engine,
        backgroundState: {
          ...mockInitialState.engine?.backgroundState,
          MultichainNetworkController: {
            ...mockInitialState.engine?.backgroundState
              ?.MultichainNetworkController,
            isEvmSelected: false,
          },
        },
      },
    };

    const { toJSON } = renderScreen(
      () => (
        <AccountRightButton selectedAddress="0x123" onPress={() => undefined} />
      ),
      {
        name: 'AccountRightButton',
      },
      { state: mockInitialStateNonEvm },
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
