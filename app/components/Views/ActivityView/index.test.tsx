import React from 'react';
import ActivityView from '.';
import { backgroundState } from '../../../util/test/initial-root-state';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { createStackNavigator } from '@react-navigation/stack';
import { fireEvent } from '@testing-library/react-native';
// eslint-disable-next-line import/no-namespace
import * as networkManagerUtils from '../../UI/NetworkManager';
import { useCurrentNetworkInfo } from '../../hooks/useCurrentNetworkInfo';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';

jest.mock('@tommasini/react-native-scrollable-tab-view', () => {
  const MockScrollableTabView = (props: {
    children?: unknown;
    [key: string]: unknown;
  }) => {
    const ReactLib = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return ReactLib.createElement(View, props, props.children);
  };
  return MockScrollableTabView;
});

const Stack = createStackNavigator();

const mockNavigation = {
  navigate: jest.fn(),
  setOptions: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn(),
  dangerouslyGetParent: () => ({
    pop: jest.fn(),
  }),
};

// Mock the useCurrentNetworkInfo hook
jest.mock('../../hooks/useCurrentNetworkInfo', () => ({
  useCurrentNetworkInfo: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
}));

jest.mock('../../../core/Engine', () => ({
  controllerMessenger: {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

jest.mock('../../hooks/useNetworksByNamespace/useNetworksByNamespace', () => ({
  useNetworksByNamespace: () => ({
    networks: [],
    selectNetwork: jest.fn(),
    selectCustomNetwork: jest.fn(),
    selectPopularNetwork: jest.fn(),
  }),
  NetworkType: {
    Popular: 'popular',
    Custom: 'custom',
  },
}));

jest.mock('../../hooks/useNetworkSelection/useNetworkSelection', () => ({
  useNetworkSelection: () => ({
    selectCustomNetwork: jest.fn(),
    selectPopularNetwork: jest.fn(),
  }),
}));
jest.mock('../../hooks/AssetPolling/useCurrencyRatePolling', () => jest.fn());
jest.mock('../../hooks/AssetPolling/useTokenRatesPolling', () => jest.fn());

jest.mock(
  '../../../selectors/featureFlagController/multichainAccounts',
  () => ({
    selectMultichainAccountsState2Enabled: () => false,
  }),
);

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderComponent = (state: any = {}) =>
  renderWithProvider(
    <Stack.Navigator>
      <Stack.Screen name="Amount" options={{}}>
        {() => <ActivityView />}
      </Stack.Screen>
    </Stack.Navigator>,
    { state },
  );

const mockInitialState = {
  engine: {
    backgroundState,
  },
};

describe('ActivityView', () => {
  const mockUseCurrentNetworkInfo =
    useCurrentNetworkInfo as jest.MockedFunction<typeof useCurrentNetworkInfo>;

  const defaultNetworkInfo = {
    enabledNetworks: [
      { chainId: '0x1', enabled: true },
      { chainId: '0x89', enabled: true },
    ],
    getNetworkInfo: jest.fn((index: number = 0) => {
      const networks = [
        { caipChainId: 'eip155:1', networkName: 'Ethereum Mainnet' },
        { caipChainId: 'eip155:137', networkName: 'Polygon' },
      ];
      return networks[index] || null;
    }),
    getNetworkInfoByChainId: jest.fn((chainId: string) => {
      const networks: Record<
        string,
        { caipChainId: string; networkName: string }
      > = {
        '0x1': { caipChainId: 'eip155:1', networkName: 'Ethereum Mainnet' },
        '0x89': { caipChainId: 'eip155:137', networkName: 'Polygon' },
      };
      return networks[chainId] || null;
    }),
    hasEnabledNetworks: true,
    isDisabled: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCurrentNetworkInfo.mockReturnValue(defaultNetworkInfo);
  });

  it('should render correctly', () => {
    const { toJSON } = renderComponent(mockInitialState);
    expect(toJSON()).toMatchSnapshot();
  });

  describe('Network Manager Integration', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('shows "Popular networks" when multiple networks are enabled', () => {
      const { getByText } = renderComponent(mockInitialState);

      expect(getByText('Popular networks')).toBeTruthy();
    });

    it('shows current network name when only one network is enabled', () => {
      const singleNetworkInfo = {
        enabledNetworks: [{ chainId: '0x1', enabled: true }],
        getNetworkInfo: jest.fn(() => ({
          caipChainId: 'eip155:1',
          networkName: 'Ethereum Mainnet',
        })),
        getNetworkInfoByChainId: jest.fn((chainId: string) => {
          const networks: Record<
            string,
            { caipChainId: string; networkName: string }
          > = {
            '0x1': {
              caipChainId: 'eip155:1',
              networkName: 'Ethereum Mainnet',
            },
          };
          return networks[chainId] || null;
        }),
        hasEnabledNetworks: true,
        isDisabled: false,
      };
      mockUseCurrentNetworkInfo.mockReturnValue(singleNetworkInfo);

      const { getByText } = renderComponent(mockInitialState);

      expect(getByText('Ethereum Mainnet')).toBeTruthy();
    });

    it('navigates to NetworkManager when filter button is pressed', () => {
      const mockNetworkManagerNavDetails = [
        'NetworkManager',
        { screen: 'NetworkSelector' },
      ] as const;

      const spyOnCreateNetworkManagerNavDetails = jest
        .spyOn(networkManagerUtils, 'createNetworkManagerNavDetails')
        .mockReturnValue(mockNetworkManagerNavDetails);

      const { getByTestId } = renderComponent(mockInitialState);

      const filterButton = getByTestId(
        WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER,
      );
      fireEvent.press(filterButton);

      expect(spyOnCreateNetworkManagerNavDetails).toHaveBeenCalledWith({});
      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        ...mockNetworkManagerNavDetails,
      );

      spyOnCreateNetworkManagerNavDetails.mockRestore();
    });

    it('disables button when network info is disabled', () => {
      const disabledNetworkInfo = {
        ...defaultNetworkInfo,
        isDisabled: true,
      };
      mockUseCurrentNetworkInfo.mockReturnValue(disabledNetworkInfo);

      const { getByTestId } = renderComponent(mockInitialState);
      const filterButton = getByTestId(
        WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER,
      );

      expect(filterButton.props.disabled).toBe(true);
    });
  });
});
