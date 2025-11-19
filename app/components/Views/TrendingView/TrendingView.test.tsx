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
import { updateLastTrendingScreen } from '../../Nav/Main/MainNavigator';
import {
  selectChainId,
  selectPopularNetworkConfigurationsByCaipChainId,
  selectCustomNetworkConfigurationsByCaipChainId,
} from '../../../selectors/networkController';
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';
import { selectEnabledNetworksByNamespace } from '../../../selectors/networkEnablementController';
import { selectMultichainAccountsState2Enabled } from '../../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts';
import { selectSelectedInternalAccountByScope } from '../../../selectors/multichainAccounts/accounts';
import { useSelector } from 'react-redux';

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

jest.mock('../Browser', () => ({
  __esModule: true,
  default: jest.fn(() => null),
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
jest.mock('../../../components/UI/Assets/hooks/useTrendingRequest', () => ({
  useTrendingRequest: jest.fn(() => ({
    results: [],
    isLoading: false,
    error: null,
    fetch: jest.fn(),
  })),
}));

describe('TrendingView', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsEnabled.mockReturnValue(true);
    mockAddListener.mockReturnValue(jest.fn());

    mockUseSelector.mockImplementation((selector) => {
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
      if (selector === selectPopularNetworkConfigurationsByCaipChainId) {
        // Return empty array to prevent Object.entries() error
        return [];
      }
      if (selector === selectCustomNetworkConfigurationsByCaipChainId) {
        // Return empty array to prevent Object.entries() error
        return [];
      }
      if (selector === selectMultichainAccountsState2Enabled) {
        // Return false to use default networks behavior
        return false;
      }
      // Handle selectSelectedInternalAccountByScope which is a selector factory
      // It returns a function that takes a scope and returns an account
      if (selector === selectSelectedInternalAccountByScope) {
        // Return a function that returns null (no account selected)
        return (_scope: string) => null;
      }
      // Fallback: if selector is a function and might be a selector factory, return a function
      if (typeof selector === 'function') {
        const selectorStr = selector.toString();
        if (
          selectorStr.includes('selectSelectedInternalAccountByScope') ||
          selectorStr.includes('SelectedInternalAccountByScope')
        ) {
          return (_scope: string) => null;
        }
      }
      return undefined;
    });
  });

  it('renders browser button in header', () => {
    const { getByTestId } = render(
      <NavigationContainer>
        <TrendingView />
      </NavigationContainer>,
    );

    const browserButton = getByTestId('trending-view-browser-button');

    expect(browserButton).toBeDefined();
  });

  describe('browser button states', () => {
    it('displays add icon when no browser tabs are open', () => {
      mockUseSelector.mockImplementation((selector) => {
        // Handle browser tabs count selector
        if (typeof selector === 'function') {
          const selectorStr = selector.toString();
          if (selectorStr.includes('browser') && selectorStr.includes('tabs')) {
            return 0;
          }
        }
        // Return default mock values for other selectors
        if (selector === selectChainId) {
          return '0x1';
        }
        if (selector === selectIsEvmNetworkSelected) {
          return true;
        }
        if (selector === selectEnabledNetworksByNamespace) {
          return { eip155: { '0x1': true } };
        }
        if (selector === selectPopularNetworkConfigurationsByCaipChainId) {
          return [];
        }
        if (selector === selectCustomNetworkConfigurationsByCaipChainId) {
          return [];
        }
        if (selector === selectMultichainAccountsState2Enabled) {
          return false;
        }
        if (selector === selectSelectedInternalAccountByScope) {
          return (_scope: string) => null;
        }
        if (typeof selector === 'function') {
          const selectorStr = selector.toString();
          if (
            selectorStr.includes('selectSelectedInternalAccountByScope') ||
            selectorStr.includes('SelectedInternalAccountByScope')
          ) {
            return (_scope: string) => null;
          }
        }
        return undefined;
      });

      const { getByTestId, queryByText } = render(
        <NavigationContainer>
          <TrendingView />
        </NavigationContainer>,
      );

      const browserButton = getByTestId('trending-view-browser-button');

      expect(browserButton).toBeDefined();
      expect(queryByText(/^\d+$/)).toBeNull();
    });

    it('displays tab count when one browser tab is open', () => {
      mockUseSelector.mockImplementation((selector) => {
        // Handle browser tabs count selector
        if (typeof selector === 'function') {
          const selectorStr = selector.toString();
          if (selectorStr.includes('browser') && selectorStr.includes('tabs')) {
            return 1;
          }
        }
        // Return default mock values for other selectors
        if (selector === selectChainId) {
          return '0x1';
        }
        if (selector === selectIsEvmNetworkSelected) {
          return true;
        }
        if (selector === selectEnabledNetworksByNamespace) {
          return { eip155: { '0x1': true } };
        }
        if (selector === selectPopularNetworkConfigurationsByCaipChainId) {
          return [];
        }
        if (selector === selectCustomNetworkConfigurationsByCaipChainId) {
          return [];
        }
        if (selector === selectMultichainAccountsState2Enabled) {
          return false;
        }
        if (selector === selectSelectedInternalAccountByScope) {
          return (_scope: string) => null;
        }
        if (typeof selector === 'function') {
          const selectorStr = selector.toString();
          if (
            selectorStr.includes('selectSelectedInternalAccountByScope') ||
            selectorStr.includes('SelectedInternalAccountByScope')
          ) {
            return (_scope: string) => null;
          }
        }
        return undefined;
      });

      const { getByText } = render(
        <NavigationContainer>
          <TrendingView />
        </NavigationContainer>,
      );

      expect(getByText('1')).toBeDefined();
    });

    it('displays tab count when multiple browser tabs are open', () => {
      mockUseSelector.mockImplementation((selector) => {
        // Handle browser tabs count selector
        if (typeof selector === 'function') {
          const selectorStr = selector.toString();
          if (selectorStr.includes('browser') && selectorStr.includes('tabs')) {
            return 5;
          }
        }
        // Return default mock values for other selectors
        if (selector === selectChainId) {
          return '0x1';
        }
        if (selector === selectIsEvmNetworkSelected) {
          return true;
        }
        if (selector === selectEnabledNetworksByNamespace) {
          return { eip155: { '0x1': true } };
        }
        if (selector === selectPopularNetworkConfigurationsByCaipChainId) {
          return [];
        }
        if (selector === selectCustomNetworkConfigurationsByCaipChainId) {
          return [];
        }
        if (selector === selectMultichainAccountsState2Enabled) {
          return false;
        }
        if (selector === selectSelectedInternalAccountByScope) {
          return (_scope: string) => null;
        }
        if (typeof selector === 'function') {
          const selectorStr = selector.toString();
          if (
            selectorStr.includes('selectSelectedInternalAccountByScope') ||
            selectorStr.includes('SelectedInternalAccountByScope')
          ) {
            return (_scope: string) => null;
          }
        }
        return undefined;
      });

      const { getByText } = render(
        <NavigationContainer>
          <TrendingView />
        </NavigationContainer>,
      );

      expect(getByText('5')).toBeDefined();
    });

    it('displays tab count when many browser tabs are open', () => {
      mockUseSelector.mockImplementation((selector) => {
        // Handle browser tabs count selector
        if (typeof selector === 'function') {
          const selectorStr = selector.toString();
          if (selectorStr.includes('browser') && selectorStr.includes('tabs')) {
            return 99;
          }
        }
        // Return default mock values for other selectors
        if (selector === selectChainId) {
          return '0x1';
        }
        if (selector === selectIsEvmNetworkSelected) {
          return true;
        }
        if (selector === selectEnabledNetworksByNamespace) {
          return { eip155: { '0x1': true } };
        }
        if (selector === selectPopularNetworkConfigurationsByCaipChainId) {
          return [];
        }
        if (selector === selectCustomNetworkConfigurationsByCaipChainId) {
          return [];
        }
        if (selector === selectMultichainAccountsState2Enabled) {
          return false;
        }
        if (selector === selectSelectedInternalAccountByScope) {
          return (_scope: string) => null;
        }
        if (typeof selector === 'function') {
          const selectorStr = selector.toString();
          if (
            selectorStr.includes('selectSelectedInternalAccountByScope') ||
            selectorStr.includes('SelectedInternalAccountByScope')
          ) {
            return (_scope: string) => null;
          }
        }
        return undefined;
      });

      const { getByText } = render(
        <NavigationContainer>
          <TrendingView />
        </NavigationContainer>,
      );

      expect(getByText('99')).toBeDefined();
    });

    it('navigates to TrendingBrowser when button is pressed with no tabs', () => {
      mockUseSelector.mockImplementation((selector) => {
        // Handle browser tabs count selector
        if (typeof selector === 'function') {
          const selectorStr = selector.toString();
          if (selectorStr.includes('browser') && selectorStr.includes('tabs')) {
            return 0;
          }
          if (selectorStr.includes('dataCollectionForMarketing')) {
            return false;
          }
        }
        // Return default mock values for other selectors
        if (selector === selectChainId) {
          return '0x1';
        }
        if (selector === selectIsEvmNetworkSelected) {
          return true;
        }
        if (selector === selectEnabledNetworksByNamespace) {
          return { eip155: { '0x1': true } };
        }
        if (selector === selectPopularNetworkConfigurationsByCaipChainId) {
          return [];
        }
        if (selector === selectCustomNetworkConfigurationsByCaipChainId) {
          return [];
        }
        if (selector === selectMultichainAccountsState2Enabled) {
          return false;
        }
        if (selector === selectSelectedInternalAccountByScope) {
          return (_scope: string) => null;
        }
        if (typeof selector === 'function') {
          const selectorStr = selector.toString();
          if (
            selectorStr.includes('selectSelectedInternalAccountByScope') ||
            selectorStr.includes('SelectedInternalAccountByScope')
          ) {
            return (_scope: string) => null;
          }
        }
        return undefined;
      });

      const { getByTestId } = render(
        <NavigationContainer>
          <TrendingView />
        </NavigationContainer>,
      );

      const browserButton = getByTestId('trending-view-browser-button');
      fireEvent.press(browserButton);

      expect(mockNavigate).toHaveBeenCalledWith('TrendingBrowser', {
        newTabUrl: expect.stringContaining('?metamaskEntry=mobile'),
        timestamp: expect.any(Number),
        fromTrending: true,
      });
      expect(updateLastTrendingScreen).toHaveBeenCalledWith('TrendingBrowser');
    });

    it('navigates to TrendingBrowser when button is pressed with existing tabs', () => {
      mockUseSelector.mockImplementation((selector) => {
        // Handle browser tabs count selector
        if (typeof selector === 'function') {
          const selectorStr = selector.toString();
          if (selectorStr.includes('browser') && selectorStr.includes('tabs')) {
            return 3;
          }
          if (selectorStr.includes('dataCollectionForMarketing')) {
            return false;
          }
        }
        // Return default mock values for other selectors
        if (selector === selectChainId) {
          return '0x1';
        }
        if (selector === selectIsEvmNetworkSelected) {
          return true;
        }
        if (selector === selectEnabledNetworksByNamespace) {
          return { eip155: { '0x1': true } };
        }
        if (selector === selectPopularNetworkConfigurationsByCaipChainId) {
          return [];
        }
        if (selector === selectCustomNetworkConfigurationsByCaipChainId) {
          return [];
        }
        if (selector === selectMultichainAccountsState2Enabled) {
          return false;
        }
        if (selector === selectSelectedInternalAccountByScope) {
          return (_scope: string) => null;
        }
        if (typeof selector === 'function') {
          const selectorStr = selector.toString();
          if (
            selectorStr.includes('selectSelectedInternalAccountByScope') ||
            selectorStr.includes('SelectedInternalAccountByScope')
          ) {
            return (_scope: string) => null;
          }
        }
        return undefined;
      });

      const { getByTestId } = render(
        <NavigationContainer>
          <TrendingView />
        </NavigationContainer>,
      );

      const browserButton = getByTestId('trending-view-browser-button');
      fireEvent.press(browserButton);

      expect(mockNavigate).toHaveBeenCalledWith('TrendingBrowser', {
        newTabUrl: expect.stringContaining('?metamaskEntry=mobile'),
        timestamp: expect.any(Number),
        fromTrending: true,
      });
      expect(updateLastTrendingScreen).toHaveBeenCalledWith('TrendingBrowser');
    });
  });

  it('renders title in header', () => {
    const { getByText } = render(
      <NavigationContainer>
        <TrendingView />
      </NavigationContainer>,
    );

    expect(getByText('Trending')).toBeDefined();
  });

  it('navigates to TrendingBrowser route when browser button is pressed', () => {
    const { getByTestId } = render(
      <NavigationContainer>
        <TrendingView />
      </NavigationContainer>,
    );

    const browserButton = getByTestId('trending-view-browser-button');

    fireEvent.press(browserButton);

    expect(mockNavigate).toHaveBeenCalledWith('TrendingBrowser', {
      newTabUrl: expect.stringContaining('?metamaskEntry=mobile'),
      timestamp: expect.any(Number),
      fromTrending: true,
    });
    expect(updateLastTrendingScreen).toHaveBeenCalledWith('TrendingBrowser');
  });

  it('includes portfolio URL with correct parameters when browser button is pressed', () => {
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
        newTabUrl: expect.stringContaining('metamaskEntry=mobile'),
        fromTrending: true,
      }),
    );
  });

  it('renders search bar button', () => {
    const { getByTestId } = render(
      <NavigationContainer>
        <TrendingView />
      </NavigationContainer>,
    );

    const searchButton = getByTestId('explore-view-search-button');

    expect(searchButton).toBeDefined();
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
});
