import React from 'react';
import ActivityView from '.';
import { backgroundState } from '../../../util/test/initial-root-state';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { createStackNavigator } from '@react-navigation/stack';
import { fireEvent } from '@testing-library/react-native';
// eslint-disable-next-line import/no-namespace
import * as networkManagerUtils from '../../UI/NetworkManager';
import { useCurrentNetworkInfo } from '../../hooks/useCurrentNetworkInfo';
import { WalletViewSelectorsIDs } from '../Wallet/WalletView.testIds';

// Mock the Perps feature flag selector - will be controlled per test
let mockPerpsEnabled = false;
jest.mock('../../UI/Perps/selectors/featureFlags', () => ({
  selectPerpsEnabledFlag: jest.fn(() => mockPerpsEnabled),
  selectPerpsServiceInterruptionBannerEnabledFlag: jest.fn(() => false),
  selectPerpsGtmOnboardingModalEnabledFlag: jest.fn(() => false),
}));

// Mock the Predict feature flag selector - will be controlled per test
let mockPredictEnabled = false;
jest.mock('../../UI/Predict/selectors/featureFlags', () => ({
  selectPredictEnabledFlag: jest.fn(() => mockPredictEnabled),
  selectPredictGtmOnboardingModalEnabledFlag: jest.fn(() => false),
}));

// Track which tabs are rendered - populated by mock
let renderedTabs: string[] = [];

// Helper to get rendered tabs for assertions
const getRenderedTabs = () => renderedTabs;
const clearRenderedTabs = () => {
  renderedTabs = [];
};

jest.mock('../../../component-library/components-temp/Tabs', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  const TabsList = ReactActual.forwardRef(
    (
      props: {
        children?: React.ReactElement[];
        onChangeTab?: (params: { i: number }) => void;
        [key: string]: unknown;
      },
      ref: React.Ref<{ goToTabIndex: (index: number) => void }>,
    ) => {
      const children = Array.isArray(props.children) ? props.children : [];

      // Track tab keys via effect to avoid writing during render
      ReactActual.useEffect(() => {
        const tabKeys: string[] = [];
        ReactActual.Children.forEach(children, (child: React.ReactNode) => {
          if (child != null && ReactActual.isValidElement(child)) {
            const element = child as React.ReactElement;
            if (element.key != null) {
              tabKeys.push(String(element.key));
            }
          }
        });
        // Update module-level variable for test assertions
        renderedTabs = tabKeys;
      }, [children]);

      ReactActual.useImperativeHandle(ref, () => ({
        goToTabIndex: (index: number) => {
          props.onChangeTab?.({ i: index });
        },
      }));

      return ReactActual.createElement(
        View,
        { testID: 'tabs-list' },
        ReactActual.Children.map(
          children,
          (child: React.ReactNode, index: number) => {
            const key =
              child != null && ReactActual.isValidElement(child)
                ? (child as React.ReactElement).key != null
                  ? String((child as React.ReactElement).key)
                  : index
                : index;
            return ReactActual.createElement(
              View,
              { key, testID: `tab-${key}` },
              child,
            );
          },
        ),
      );
    },
  );

  return { TabsList };
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

jest.mock('../../hooks/AssetPolling/useCurrencyRatePolling', () => jest.fn());
jest.mock('../../hooks/AssetPolling/useTokenRatesPolling', () => jest.fn());

jest.mock(
  '../../../selectors/featureFlagController/multichainAccounts',
  () => ({
    selectMultichainAccountsState2Enabled: () => false,
  }),
);

jest.mock(
  '../../UI/Predict/views/PredictTransactionsView/PredictTransactionsView',
  () => {
    const { View, Text } = jest.requireActual('react-native');
    return function MockPredictTransactionsView({
      isVisible,
    }: {
      isVisible: boolean;
    }) {
      return (
        <View testID="predict-transactions-view">
          <Text testID="predict-visibility">
            {isVisible ? 'visible' : 'hidden'}
          </Text>
        </View>
      );
    };
  },
);

jest.mock('../../UI/Perps/Views/PerpsTransactionsView', () => {
  const { View } = jest.requireActual('react-native');
  return function MockPerpsTransactionsView() {
    return <View testID="perps-transactions-view" />;
  };
});

jest.mock('../../UI/Perps/providers/PerpsConnectionProvider', () => ({
  PerpsConnectionProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

jest.mock('../../UI/Perps/providers/PerpsStreamManager', () => ({
  PerpsStreamProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

jest.mock('../../UI/Ramp/Aggregator/Views/OrdersList', () => {
  const { View } = jest.requireActual('react-native');
  return function MockRampOrdersList() {
    return <View testID="ramp-orders-list" />;
  };
});

let mockIsEvmSelected = true;
jest.mock('../../../selectors/multichainNetworkController', () => ({
  selectIsEvmNetworkSelected: jest.fn(() => mockIsEvmSelected),
  selectSelectedNonEvmNetworkSymbol: jest.fn(() => 'SOL'),
  selectSelectedNonEvmNetworkChainId: jest.fn(() => 'solana:mainnet'),
  selectNonEvmNetworkConfigurationsByChainId: jest.fn(() => ({})),
  selectSelectedNonEvmNetworkName: jest.fn(() => 'Solana'),
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
    mockIsEvmSelected = true;
    mockPerpsEnabled = false;
    mockPredictEnabled = false;
    clearRenderedTabs();
  });

  it('matches snapshot', () => {
    const { toJSON } = renderComponent(mockInitialState);

    expect(toJSON()).toMatchSnapshot();
  });

  describe('Network Manager Integration', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('displays "Popular networks" text when multiple networks are enabled', () => {
      const { getByText } = renderComponent(mockInitialState);

      expect(getByText('Popular networks')).toBeTruthy();
    });

    it('displays network name when single network is enabled', () => {
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

    it('navigates to NetworkManager on filter button press', () => {
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

    it('disables filter button when network info isDisabled is true', () => {
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

  describe('back button', () => {
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

    it('invokes navigation.goBack on back button press', () => {
      mockRoute.params = { showBackButton: true };
      const { getByTestId } = renderComponent(mockInitialState);
      const backButton = getByTestId('activity-view-back-button');

      fireEvent.press(backButton);

      expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
    });

    it('does not invoke navigation.goBack when canGoBack returns false', () => {
      mockRoute.params = { showBackButton: true };
      mockNavigation.canGoBack.mockReturnValueOnce(false);
      const { getByTestId } = renderComponent(mockInitialState);
      const backButton = getByTestId('activity-view-back-button');

      fireEvent.press(backButton);

      expect(mockNavigation.goBack).not.toHaveBeenCalled();
    });

    it('sets headerShown to false when showBackButton is true', () => {
      mockRoute.params = { showBackButton: true };

      renderComponent(mockInitialState);

      expect(mockNavigation.setOptions).toHaveBeenCalledWith({
        headerShown: false,
      });
    });

    it('sets default header options when showBackButton is false', () => {
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

  describe('Perps tab', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockRoute.params = {};
    });

    it('includes Perps tab when feature flag is enabled on EVM network', () => {
      mockPerpsEnabled = true;
      mockIsEvmSelected = true;

      const { getByTestId } = renderComponent(mockInitialState);

      expect(getByTestId('tab-perps')).toBeTruthy();
      expect(getRenderedTabs()).toContain('perps');
    });

    it('excludes Perps tab when feature flag is disabled', () => {
      mockPerpsEnabled = false;
      mockIsEvmSelected = true;

      renderComponent(mockInitialState);

      expect(getRenderedTabs()).not.toContain('perps');
    });

    it('excludes Perps tab on non-EVM network even with feature flag enabled', () => {
      mockPerpsEnabled = true;
      mockIsEvmSelected = false;

      renderComponent(mockInitialState);

      expect(getRenderedTabs()).not.toContain('perps');
    });
  });

  describe('Predict tab', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockRoute.params = {};
    });

    it('includes Predict tab when feature flag is enabled', () => {
      mockPredictEnabled = true;

      const { getByTestId } = renderComponent(mockInitialState);

      expect(getByTestId('tab-predict')).toBeTruthy();
      expect(getRenderedTabs()).toContain('predict');
    });

    it('excludes Predict tab when feature flag is disabled', () => {
      mockPredictEnabled = false;

      renderComponent(mockInitialState);

      expect(getRenderedTabs()).not.toContain('predict');
    });

    it('includes Predict tab on non-EVM network when feature flag is enabled', () => {
      mockPredictEnabled = true;
      mockIsEvmSelected = false;

      const { getByTestId } = renderComponent(mockInitialState);

      expect(getByTestId('tab-predict')).toBeTruthy();
      expect(getRenderedTabs()).toContain('predict');
    });
  });

  describe('tab ordering', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockRoute.params = {};
    });

    it('orders tabs as Transactions, Orders, Perps, Predict when all features enabled', () => {
      mockPerpsEnabled = true;
      mockPredictEnabled = true;
      mockIsEvmSelected = true;

      renderComponent(mockInitialState);

      expect(getRenderedTabs()).toEqual([
        'transactions',
        'orders',
        'perps',
        'predict',
      ]);
    });

    it('orders tabs as Transactions, Orders, Predict when Perps disabled', () => {
      mockPerpsEnabled = false;
      mockPredictEnabled = true;

      renderComponent(mockInitialState);

      expect(getRenderedTabs()).toEqual(['transactions', 'orders', 'predict']);
    });

    it('orders tabs as Transactions, Orders, Perps when Predict disabled', () => {
      mockPerpsEnabled = true;
      mockPredictEnabled = false;
      mockIsEvmSelected = true;

      renderComponent(mockInitialState);

      expect(getRenderedTabs()).toEqual(['transactions', 'orders', 'perps']);
    });

    it('includes only Transactions and Orders tabs when all feature flags disabled', () => {
      mockPerpsEnabled = false;
      mockPredictEnabled = false;

      renderComponent(mockInitialState);

      expect(getRenderedTabs()).toEqual(['transactions', 'orders']);
    });
  });
});
