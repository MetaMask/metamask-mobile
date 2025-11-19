import React from 'react';
import ActivityView from '.';
import { backgroundState } from '../../../util/test/initial-root-state';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { createStackNavigator } from '@react-navigation/stack';
import { fireEvent } from '@testing-library/react-native';
// eslint-disable-next-line import/no-namespace
import * as networkUtils from '../../../util/networks';
// eslint-disable-next-line import/no-namespace
import * as networkManagerUtils from '../../UI/NetworkManager';
// eslint-disable-next-line import/no-namespace
import * as tokenBottomSheetUtils from '../../UI/Tokens/TokensBottomSheet';
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
  canGoBack: jest.fn(() => true),
  reset: jest.fn(),
  dangerouslyGetParent: () => ({
    pop: jest.fn(),
  }),
};

// Mock the useCurrentNetworkInfo hook
jest.mock('../../hooks/useCurrentNetworkInfo', () => ({
  useCurrentNetworkInfo: jest.fn(),
}));

const mockRoute = {
  params: {},
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useRoute: () => mockRoute,
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

// Mock Perps and Predict selectors
const mockPerpsSelector = { enabled: false };
const mockPredictSelector = { enabled: false };

jest.mock('../../UI/Perps', () => ({
  ...jest.requireActual('../../UI/Perps'),
  selectPerpsEnabledFlag: () => mockPerpsSelector.enabled,
}));

jest.mock('../../UI/Predict/selectors/featureFlags', () => ({
  ...jest.requireActual('../../UI/Predict/selectors/featureFlags'),
  selectPredictEnabledFlag: () => mockPredictSelector.enabled,
}));

// Mock Perps and Predict components
const mockPerpsConnectionProvider = jest.fn();
const mockPredictTransactionsView = jest.fn();
const mockPerpsTransactionsView = jest.fn();

jest.mock('../../UI/Perps/providers/PerpsConnectionProvider', () => ({
  PerpsConnectionProvider: (props: {
    children: React.ReactNode;
    isVisible: boolean;
  }) => {
    mockPerpsConnectionProvider(props);
    return props.children;
  },
}));

jest.mock(
  '../../UI/Predict/views/PredictTransactionsView/PredictTransactionsView',
  () => ({
    __esModule: true,
    default: (props: { isVisible: boolean }) => {
      mockPredictTransactionsView(props);
      return null;
    },
  }),
);

jest.mock('../../UI/Perps/Views/PerpsTransactionsView', () => ({
  __esModule: true,
  default: (props: unknown) => {
    mockPerpsTransactionsView(props);
    return null;
  },
}));

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

  describe('filter controls', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('navigates to network manager when global network selector is enabled', () => {
      const mockNetworkManagerNavDetails = [
        'NetworkManager',
        { screen: 'NetworkSelector' },
      ] as const;

      const spyOnIsRemoveGlobalNetworkSelectorEnabled = jest
        .spyOn(networkUtils, 'isRemoveGlobalNetworkSelectorEnabled')
        .mockReturnValue(true);
      const spyOnCreateNetworkManagerNavDetails = jest
        .spyOn(networkManagerUtils, 'createNetworkManagerNavDetails')
        .mockReturnValue(mockNetworkManagerNavDetails);

      const { getByTestId } = renderComponent(mockInitialState);

      const filterControlsButton = getByTestId(
        WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER,
      );
      fireEvent.press(filterControlsButton);

      expect(spyOnIsRemoveGlobalNetworkSelectorEnabled).toHaveBeenCalled();
      expect(spyOnCreateNetworkManagerNavDetails).toHaveBeenCalledWith({});
      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        ...mockNetworkManagerNavDetails,
      );

      spyOnIsRemoveGlobalNetworkSelectorEnabled.mockRestore();
      spyOnCreateNetworkManagerNavDetails.mockRestore();
    });

    it('navigates to token bottom sheet filter when global network selector is disabled', () => {
      const mockTokenBottomSheetNavDetails = [
        'TokenBottomSheet',
        { screen: 'TokenFilter' },
      ] as const;

      const spyOnIsRemoveGlobalNetworkSelectorEnabled = jest
        .spyOn(networkUtils, 'isRemoveGlobalNetworkSelectorEnabled')
        .mockReturnValue(false);
      const spyOnCreateTokenBottomSheetFilterNavDetails = jest
        .spyOn(tokenBottomSheetUtils, 'createTokenBottomSheetFilterNavDetails')
        .mockReturnValue(mockTokenBottomSheetNavDetails);

      const { getByTestId } = renderComponent(mockInitialState);

      const filterControlsButton = getByTestId(
        WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER,
      );
      fireEvent.press(filterControlsButton);

      expect(spyOnIsRemoveGlobalNetworkSelectorEnabled).toHaveBeenCalled();
      expect(spyOnCreateTokenBottomSheetFilterNavDetails).toHaveBeenCalledWith(
        {},
      );
      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        ...mockTokenBottomSheetNavDetails,
      );

      spyOnIsRemoveGlobalNetworkSelectorEnabled.mockRestore();
      spyOnCreateTokenBottomSheetFilterNavDetails.mockRestore();
    });
  });

  describe('Feature Flag: isRemoveGlobalNetworkSelectorEnabled', () => {
    describe('when feature flag is enabled', () => {
      beforeEach(() => {
        jest
          .spyOn(networkUtils, 'isRemoveGlobalNetworkSelectorEnabled')
          .mockReturnValue(true);
      });

      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('shows "All Networks" text when multiple networks are enabled', () => {
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
    });

    describe('when feature flag is disabled', () => {
      beforeEach(() => {
        jest
          .spyOn(networkUtils, 'isRemoveGlobalNetworkSelectorEnabled')
          .mockReturnValue(false);
      });

      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('shows "Popular Networks" text when all conditions are met', () => {
        const stateWithPopularNetworks = {
          ...mockInitialState,
          engine: {
            backgroundState: {
              ...backgroundState,
              NetworkController: {
                ...backgroundState.NetworkController,
                isAllNetworks: true,
                isPopularNetwork: true,
              },
              MultichainNetworkController: {
                ...backgroundState.MultichainNetworkController,
                isEvmNetworkSelected: true,
              },
            },
          },
        };

        const { getByText } = renderComponent(stateWithPopularNetworks);

        expect(getByText('Ethereum Main Network')).toBeTruthy();
      });

      it('shows network name when not all conditions are met', () => {
        const { getByText } = renderComponent(mockInitialState);

        expect(getByText('Ethereum Main Network')).toBeTruthy();
      });

      it('shows fallback text when network name is not available', () => {
        const stateWithoutNetworkName = {
          ...mockInitialState,
          engine: {
            backgroundState: {
              ...backgroundState,
              NetworkController: {
                ...backgroundState.NetworkController,
                isAllNetworks: false,
                isPopularNetwork: false,
                networkName: null,
              },
              MultichainNetworkController: {
                ...backgroundState.MultichainNetworkController,
                isEvmNetworkSelected: true,
              },
            },
          },
        };

        const { getByText } = renderComponent(stateWithoutNetworkName);

        expect(getByText('Ethereum Main Network')).toBeTruthy();
      });

      it('navigates to TokenFilter when filter button is pressed', () => {
        const mockTokenBottomSheetNavDetails = [
          'TokenBottomSheet',
          { screen: 'TokenFilter' },
        ] as const;

        const spyOnCreateTokenBottomSheetFilterNavDetails = jest
          .spyOn(
            tokenBottomSheetUtils,
            'createTokenBottomSheetFilterNavDetails',
          )
          .mockReturnValue(mockTokenBottomSheetNavDetails);

        const { getByTestId } = renderComponent(mockInitialState);

        const filterButton = getByTestId(
          WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER,
        );
        fireEvent.press(filterButton);

        expect(
          spyOnCreateTokenBottomSheetFilterNavDetails,
        ).toHaveBeenCalledWith({});
        expect(mockNavigation.navigate).toHaveBeenCalledWith(
          ...mockTokenBottomSheetNavDetails,
        );

        spyOnCreateTokenBottomSheetFilterNavDetails.mockRestore();
      });
    });

    describe('button behavior', () => {
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

  describe('back button behavior', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('displays back button when showBackButton param is true', () => {
      mockRoute.params = { showBackButton: true };

      const { getByTestId } = renderComponent(mockInitialState);

      expect(getByTestId('activity-view-back-button')).toBeTruthy();
    });

    it('hides back button when showBackButton param is false', () => {
      mockRoute.params = { showBackButton: false };

      const { queryByTestId } = renderComponent(mockInitialState);

      expect(queryByTestId('activity-view-back-button')).toBeNull();
    });

    it('hides back button when showBackButton param is undefined', () => {
      mockRoute.params = {};

      const { queryByTestId } = renderComponent(mockInitialState);

      expect(queryByTestId('activity-view-back-button')).toBeNull();
    });

    it('calls navigation.goBack when back button is pressed', () => {
      mockRoute.params = { showBackButton: true };

      const { getByTestId } = renderComponent(mockInitialState);
      const backButton = getByTestId('activity-view-back-button');

      fireEvent.press(backButton);

      expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
    });

    it('does not call navigation.goBack when canGoBack returns false', () => {
      mockRoute.params = { showBackButton: true };
      mockNavigation.canGoBack.mockReturnValueOnce(false);

      const { getByTestId } = renderComponent(mockInitialState);
      const backButton = getByTestId('activity-view-back-button');

      fireEvent.press(backButton);

      expect(mockNavigation.goBack).not.toHaveBeenCalled();
    });

    it('hides default header when showBackButton is true', () => {
      mockRoute.params = { showBackButton: true };

      renderComponent(mockInitialState);

      expect(mockNavigation.setOptions).toHaveBeenCalledWith({
        headerShown: false,
      });
    });

    it('shows default header when showBackButton is false', () => {
      mockRoute.params = { showBackButton: false };

      renderComponent(mockInitialState);

      expect(mockNavigation.setOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          headerTitle: expect.any(Function),
          headerLeft: null,
          headerRight: expect.any(Function),
        }),
      );
    });
  });

  describe('isVisible prop on tab components', () => {
    const createStateWithEvm = () => ({
      ...mockInitialState,
      engine: {
        backgroundState: {
          ...backgroundState,
          MultichainNetworkController: {
            ...backgroundState.MultichainNetworkController,
            isEvmSelected: true,
          },
        },
      },
    });

    const getLastCallProps = (mockFn: jest.Mock) =>
      mockFn.mock.calls[mockFn.mock.calls.length - 1]?.[0];

    beforeEach(() => {
      jest.clearAllMocks();
      mockPerpsConnectionProvider.mockClear();
      mockPredictTransactionsView.mockClear();
      mockPerpsSelector.enabled = false;
      mockPredictSelector.enabled = false;
    });

    describe('PerpsConnectionProvider', () => {
      it('passes isVisible={true} when active tab (index 2)', () => {
        mockPerpsSelector.enabled = true;
        const { UNSAFE_getAllByType } = renderComponent(createStateWithEvm());
        const MockScrollableTabView = jest.requireMock(
          '@tommasini/react-native-scrollable-tab-view',
        );
        const scrollableTabView = UNSAFE_getAllByType(MockScrollableTabView)[0];

        fireEvent(scrollableTabView, 'changeTab', { i: 2 });

        expect(getLastCallProps(mockPerpsConnectionProvider).isVisible).toBe(
          true,
        );
      });

      it('passes isVisible={false} when inactive tab', () => {
        mockPerpsSelector.enabled = true;
        renderComponent(createStateWithEvm());

        expect(getLastCallProps(mockPerpsConnectionProvider).isVisible).toBe(
          false,
        );
      });
    });

    describe('PredictTransactionsView', () => {
      it('passes isVisible={true} when active tab with Perps enabled (index 3)', () => {
        mockPerpsSelector.enabled = true;
        mockPredictSelector.enabled = true;
        const { UNSAFE_getAllByType } = renderComponent(createStateWithEvm());
        const MockScrollableTabView = jest.requireMock(
          '@tommasini/react-native-scrollable-tab-view',
        );
        const scrollableTabView = UNSAFE_getAllByType(MockScrollableTabView)[0];

        fireEvent(scrollableTabView, 'changeTab', { i: 3 });

        expect(getLastCallProps(mockPredictTransactionsView).isVisible).toBe(
          true,
        );
      });

      it('passes isVisible={true} when active tab with Perps disabled (index 2)', () => {
        mockPredictSelector.enabled = true;
        const { UNSAFE_getAllByType } = renderComponent(createStateWithEvm());
        const MockScrollableTabView = jest.requireMock(
          '@tommasini/react-native-scrollable-tab-view',
        );
        const scrollableTabView = UNSAFE_getAllByType(MockScrollableTabView)[0];

        fireEvent(scrollableTabView, 'changeTab', { i: 2 });

        expect(getLastCallProps(mockPredictTransactionsView).isVisible).toBe(
          true,
        );
      });

      it('passes isVisible={false} when inactive tab', () => {
        mockPerpsSelector.enabled = true;
        mockPredictSelector.enabled = true;
        renderComponent(createStateWithEvm());

        expect(getLastCallProps(mockPredictTransactionsView).isVisible).toBe(
          false,
        );
      });

      it('updates isVisible when switching tabs', () => {
        mockPerpsSelector.enabled = true;
        mockPredictSelector.enabled = true;
        const { UNSAFE_getAllByType } = renderComponent(createStateWithEvm());
        const MockScrollableTabView = jest.requireMock(
          '@tommasini/react-native-scrollable-tab-view',
        );
        const scrollableTabView = UNSAFE_getAllByType(MockScrollableTabView)[0];

        fireEvent(scrollableTabView, 'changeTab', { i: 2 });
        expect(getLastCallProps(mockPerpsConnectionProvider).isVisible).toBe(
          true,
        );
        expect(getLastCallProps(mockPredictTransactionsView).isVisible).toBe(
          false,
        );

        fireEvent(scrollableTabView, 'changeTab', { i: 3 });
        expect(getLastCallProps(mockPerpsConnectionProvider).isVisible).toBe(
          false,
        );
        expect(getLastCallProps(mockPredictTransactionsView).isVisible).toBe(
          true,
        );
      });
    });
  });
});
