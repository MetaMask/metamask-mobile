import React from 'react';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { SolScope } from '@metamask/keyring-api';
import {
  DeepPartial,
  renderScreen,
} from '../../../util/test/renderWithProvider';
import AccountRightButton from './';
import { backgroundState } from '../../../util/test/initial-root-state';
import { RootState } from '../../../reducers';
import { mockNetworkState } from '../../../util/test/network';
import { AccountOverviewSelectorsIDs } from './AccountOverview.testIds';

// Mock navigation and metrics
const mockNavigate = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue('mockEvent'),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
  useRoute: () => ({ params: {} }),
}));

jest.mock('../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

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
          },
        },
      },
    },
  },
};

describe('AccountRightButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it('should call onPress when button is pressed and selectedAddress is present', () => {
    const onPressMock = jest.fn();
    const { getByTestId } = renderScreen(
      () => (
        <AccountRightButton selectedAddress="0x123" onPress={onPressMock} />
      ),
      {
        name: 'AccountRightButton',
      },
      { state: mockInitialState },
    );
    // Simulate button press
    getByTestId(AccountOverviewSelectorsIDs.ACCOUNT_BUTTON).props.onPress();
    expect(onPressMock).toHaveBeenCalled();
  });

  it('should render network avatar when selectedAddress is not provided (EVM)', () => {
    const { toJSON } = renderScreen(
      () => <AccountRightButton selectedAddress="" onPress={() => undefined} />,
      {
        name: 'AccountRightButton',
      },
      { state: mockInitialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render network avatar when selectedAddress is not provided (non-EVM)', () => {
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
      () => <AccountRightButton selectedAddress="" onPress={() => undefined} />,
      {
        name: 'AccountRightButton',
      },
      { state: mockInitialStateNonEvm },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render account avatar when selectedAddress is provided', () => {
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

  it('should navigate with EVM chainId when selectedAddress is empty and EVM is selected', () => {
    const { getByTestId } = renderScreen(
      () => <AccountRightButton selectedAddress="" onPress={() => undefined} />,
      {
        name: 'AccountRightButton',
      },
      { state: mockInitialState },
    );

    getByTestId(AccountOverviewSelectorsIDs.ACCOUNT_BUTTON).props.onPress();

    expect(mockNavigate).toHaveBeenCalledWith(
      'RootModalFlow',
      expect.objectContaining({
        screen: 'NetworkSelector',
        params: expect.objectContaining({
          chainId: CHAIN_IDS.MAINNET,
        }),
      }),
    );
    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('should navigate with non-EVM chainId when selectedAddress is empty and non-EVM is selected', () => {
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

    const { getByTestId } = renderScreen(
      () => <AccountRightButton selectedAddress="" onPress={() => undefined} />,
      {
        name: 'AccountRightButton',
      },
      { state: mockInitialStateNonEvm },
    );

    getByTestId(AccountOverviewSelectorsIDs.ACCOUNT_BUTTON).props.onPress();

    expect(mockNavigate).toHaveBeenCalledWith(
      'RootModalFlow',
      expect.objectContaining({
        screen: 'NetworkSelector',
        params: expect.objectContaining({
          chainId: SolScope.Mainnet,
        }),
      }),
    );
    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('should render correct network name for non-EVM network', () => {
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
            selectedMultichainNetworkChainId: SolScope.Mainnet,
            multichainNetworkConfigurationsByChainId: {
              [SolScope.Mainnet]: {
                name: 'Solana Mainnet',
              },
            },
          },
        },
      },
    };

    const { toJSON } = renderScreen(
      () => <AccountRightButton selectedAddress="" onPress={() => undefined} />,
      {
        name: 'AccountRightButton',
      },
      { state: mockInitialStateNonEvm },
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
