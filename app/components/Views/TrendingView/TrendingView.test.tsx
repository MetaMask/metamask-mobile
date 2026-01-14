import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockIsEnabled = jest.fn();
const mockAddListener = jest.fn(() => jest.fn());

jest.mock('../../Nav/Main/MainNavigator', () => ({
  lastTrendingScreenRef: { current: 'TrendingFeed' },
  updateLastTrendingScreen: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    addListener: mockAddListener,
  }),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

import { ExploreFeed } from './TrendingView';
import {
  selectChainId,
  selectPopularNetworkConfigurationsByCaipChainId,
  selectCustomNetworkConfigurationsByCaipChainId,
  selectNetworkConfigurationsByCaipChainId,
} from '../../../selectors/networkController';
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';
import { selectEnabledNetworksByNamespace } from '../../../selectors/networkEnablementController';
import { selectMultichainAccountsState2Enabled } from '../../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts';
import { selectSelectedInternalAccountByScope } from '../../../selectors/multichainAccounts/accounts';
import { selectBasicFunctionalityEnabled } from '../../../selectors/settings';
import { useSelector } from 'react-redux';
import Routes from '../../../constants/navigation/Routes';

const Stack = createStackNavigator();

const TrendingView: React.FC = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name={Routes.TRENDING_FEED} component={ExploreFeed} />
  </Stack.Navigator>
);

jest.mock('../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    isEnabled: mockIsEnabled,
  }),
  withMetricsAwareness: (Component: unknown) => Component,
}));

jest.mock('../../../util/browser', () => ({
  buildPortfolioUrl: jest.fn((url) => ({
    href: `${url}?metamaskEntry=mobile&metricsEnabled=true&marketingEnabled=false`,
  })),
}));

// Mock the network hooks used by useTrendingRequest
jest.mock(
  '../../../components/hooks/useNetworksByNamespace/useNetworksByNamespace',
  () => ({
    useNetworksByNamespace: jest.fn(() => ({
      networks: [],
      selectedNetworks: [],
      areAllNetworksSelected: false,
      areAnyNetworksSelected: false,
      networkCount: 0,
      selectedCount: 0,
    })),
    NetworkType: {
      Popular: 'popular',
      Custom: 'custom',
    },
  }),
);

jest.mock(
  '../../../components/hooks/useNetworksToUse/useNetworksToUse',
  () => ({
    useNetworksToUse: jest.fn(() => ({
      networksToUse: [],
      evmNetworks: [],
      solanaNetworks: [],
      selectedEvmAccount: null,
      selectedSolanaAccount: null,
      isMultichainAccountsState2Enabled: false,
      areAllNetworksSelectedCombined: false,
      areAllEvmNetworksSelected: false,
      areAllSolanaNetworksSelected: false,
    })),
  }),
);

// Mock useTrendingRequest to return empty results
jest.mock(
  '../../../components/UI/Trending/hooks/useTrendingRequest/useTrendingRequest',
  () => ({
    useTrendingRequest: jest.fn(() => ({
      results: [],
      isLoading: false,
      error: null,
      fetch: jest.fn(),
    })),
  }),
);

describe('TrendingView', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;

  /**
   * Helper function to create mock selector implementation with optional overrides
   */
  const createMockSelectorImplementation =
    (
      overrides: {
        browserTabs?: { id: number; url: string }[];
        multichainEnabled?: boolean;
        basicFunctionalityEnabled?: boolean;
      } = {},
    ) =>
    (selector: unknown) => {
      // Handle browser tabs selector
      if (typeof selector === 'function') {
        const selectorStr = selector.toString();
        if (selectorStr.includes('browser') && selectorStr.includes('tabs')) {
          return overrides.browserTabs ?? [];
        }
        // Handle selectSelectedInternalAccountByScope which is a selector factory
        if (
          selectorStr.includes('selectSelectedInternalAccountByScope') ||
          selectorStr.includes('SelectedInternalAccountByScope')
        ) {
          return (_scope: string) => null;
        }
      }

      // Compare selectors by reference for memoized selectors
      if (selector === selectChainId) {
        return '0x1';
      }
      if (selector === selectIsEvmNetworkSelected) {
        return true;
      }
      if (selector === selectEnabledNetworksByNamespace) {
        return {
          eip155: {
            '0x1': true,
          },
        };
      }
      if (selector === selectNetworkConfigurationsByCaipChainId) {
        return {};
      }
      if (selector === selectPopularNetworkConfigurationsByCaipChainId) {
        return [];
      }
      if (selector === selectCustomNetworkConfigurationsByCaipChainId) {
        return [];
      }
      if (selector === selectMultichainAccountsState2Enabled) {
        return overrides.multichainEnabled ?? false;
      }
      if (selector === selectBasicFunctionalityEnabled) {
        return overrides.basicFunctionalityEnabled ?? true;
      }
      if (selector === selectSelectedInternalAccountByScope) {
        return (_scope: string) => null;
      }

      return undefined;
    };

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsEnabled.mockReturnValue(true);
    mockAddListener.mockReturnValue(jest.fn());

    mockUseSelector.mockImplementation(createMockSelectorImplementation());
  });

  describe('browser button states', () => {
    it('displays add icon when no browser tabs are open', () => {
      mockUseSelector.mockImplementation(
        createMockSelectorImplementation({ browserTabs: [] }),
      );

      const { getByTestId, queryByText } = render(
        <NavigationContainer>
          <TrendingView />
        </NavigationContainer>,
      );

      const browserButton = getByTestId('trending-view-browser-button');
      expect(browserButton).toBeOnTheScreen();
      expect(queryByText(/^\d+$/)).toBeNull();
    });

    it('displays tab count when one browser tab is open', () => {
      mockUseSelector.mockImplementation(
        createMockSelectorImplementation({
          browserTabs: [{ id: 1, url: 'https://example.com' }],
        }),
      );

      const { getByText } = render(
        <NavigationContainer>
          <TrendingView />
        </NavigationContainer>,
      );

      expect(getByText('1')).toBeOnTheScreen();
    });

    it('displays tab count when multiple browser tabs are open', () => {
      mockUseSelector.mockImplementation(
        createMockSelectorImplementation({
          browserTabs: [
            { id: 1, url: 'https://example.com' },
            { id: 2, url: 'https://example2.com' },
            { id: 3, url: 'https://example3.com' },
            { id: 4, url: 'https://example4.com' },
            { id: 5, url: 'https://example5.com' },
          ],
        }),
      );

      const { getByText } = render(
        <NavigationContainer>
          <TrendingView />
        </NavigationContainer>,
      );

      expect(getByText('5')).toBeOnTheScreen();
    });

    it('displays tab count when many browser tabs are open', () => {
      const tabs = Array.from({ length: 99 }, (_, i) => ({
        id: i + 1,
        url: `https://example${i}.com`,
      }));
      mockUseSelector.mockImplementation(
        createMockSelectorImplementation({ browserTabs: tabs }),
      );

      const { getByText } = render(
        <NavigationContainer>
          <TrendingView />
        </NavigationContainer>,
      );

      expect(getByText('99')).toBeOnTheScreen();
    });

    it('navigates to browser with newTabUrl when no portfolio tab exists', () => {
      mockUseSelector.mockImplementation(
        createMockSelectorImplementation({
          browserTabs: [{ id: 1, url: 'https://example.com' }],
        }),
      );

      const { getByTestId } = render(
        <NavigationContainer>
          <TrendingView />
        </NavigationContainer>,
      );

      const browserButton = getByTestId('trending-view-browser-button');
      fireEvent.press(browserButton);

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.BROWSER.HOME,
        expect.objectContaining({
          screen: Routes.BROWSER.VIEW,
          params: expect.objectContaining({
            newTabUrl: expect.stringContaining('?metamaskEntry=mobile'),
            fromTrending: true,
          }),
        }),
      );
    });

    it('navigates to existing portfolio tab when one already exists', () => {
      mockUseSelector.mockImplementation(
        createMockSelectorImplementation({
          browserTabs: [
            { id: 1, url: 'https://example.com' },
            { id: 2, url: 'https://portfolio.metamask.io/explore' },
            { id: 3, url: 'https://another.com' },
          ],
        }),
      );

      const { getByTestId } = render(
        <NavigationContainer>
          <TrendingView />
        </NavigationContainer>,
      );

      const browserButton = getByTestId('trending-view-browser-button');
      fireEvent.press(browserButton);

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.BROWSER.HOME,
        expect.objectContaining({
          screen: Routes.BROWSER.VIEW,
          params: expect.objectContaining({
            existingTabId: 2,
            fromTrending: true,
          }),
        }),
      );
      // Should NOT have newTabUrl when using existingTabId
      expect(mockNavigate).not.toHaveBeenCalledWith(
        Routes.BROWSER.HOME,
        expect.objectContaining({
          params: expect.objectContaining({
            newTabUrl: expect.anything(),
          }),
        }),
      );
    });
  });

  it('renders title in header', () => {
    const { getByText } = render(
      <NavigationContainer>
        <TrendingView />
      </NavigationContainer>,
    );

    expect(getByText('Explore')).toBeOnTheScreen();
  });

  it('renders search bar button', () => {
    const { getByTestId } = render(
      <NavigationContainer>
        <TrendingView />
      </NavigationContainer>,
    );

    const searchButton = getByTestId('explore-view-search-button');

    expect(searchButton).toBeOnTheScreen();
  });

  it('navigates to ExploreSearch route when search bar is pressed', () => {
    const { getByTestId } = render(
      <NavigationContainer>
        <TrendingView />
      </NavigationContainer>,
    );

    const searchButton = getByTestId('explore-view-search-button');
    fireEvent.press(searchButton);

    expect(mockNavigate).toHaveBeenCalledWith('ExploreSearch');
  });

  describe('basic functionality toggle', () => {
    it('displays empty state when basic functionality is disabled', () => {
      mockUseSelector.mockImplementation(
        createMockSelectorImplementation({ basicFunctionalityEnabled: false }),
      );

      const { getByTestId } = render(
        <NavigationContainer>
          <TrendingView />
        </NavigationContainer>,
      );

      expect(getByTestId('basic-functionality-empty-state')).toBeOnTheScreen();
    });
  });
});
