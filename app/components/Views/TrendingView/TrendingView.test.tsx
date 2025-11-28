import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';

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

import TrendingView from './TrendingView';
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

jest.mock('../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    isEnabled: mockIsEnabled,
  }),
  withMetricsAwareness: (Component: unknown) => Component,
}));

jest.mock('../../../util/browser', () => ({
  appendURLParams: jest.fn((url) => ({
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
        browserTabsCount?: number;
        multichainEnabled?: boolean;
        basicFunctionalityEnabled?: boolean;
      } = {},
    ) =>
    (selector: unknown) => {
      // Handle browser tabs count selector
      if (typeof selector === 'function') {
        const selectorStr = selector.toString();
        if (selectorStr.includes('browser') && selectorStr.includes('tabs')) {
          return overrides.browserTabsCount ?? 0;
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
        createMockSelectorImplementation({ browserTabsCount: 0 }),
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
        createMockSelectorImplementation({ browserTabsCount: 1 }),
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
        createMockSelectorImplementation({ browserTabsCount: 5 }),
      );

      const { getByText } = render(
        <NavigationContainer>
          <TrendingView />
        </NavigationContainer>,
      );

      expect(getByText('5')).toBeOnTheScreen();
    });

    it('displays tab count when many browser tabs are open', () => {
      mockUseSelector.mockImplementation(
        createMockSelectorImplementation({ browserTabsCount: 99 }),
      );

      const { getByText } = render(
        <NavigationContainer>
          <TrendingView />
        </NavigationContainer>,
      );

      expect(getByText('99')).toBeOnTheScreen();
    });

    it('navigates to TrendingBrowser when button is pressed', () => {
      const { getByTestId } = render(
        <NavigationContainer>
          <TrendingView />
        </NavigationContainer>,
      );

      const browserButton = getByTestId('trending-view-browser-button');
      fireEvent.press(browserButton);

      expect(mockNavigate).toHaveBeenCalledWith(
        'TrendingBrowser',
        expect.objectContaining({
          newTabUrl: expect.stringContaining('?metamaskEntry=mobile'),
          fromTrending: true,
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
