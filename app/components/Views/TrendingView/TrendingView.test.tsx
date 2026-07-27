import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockIsEnabled = jest.fn();
const mockAddListener = jest.fn(() => jest.fn());

// Replace every tab's content with a render-tracking stub so a tab-switch
// re-render regression test doesn't have to mock each tab's underlying
// feed hooks (usePerpsFeed, useTokensFeed, etc.) to render without crashing.
// `mockTrackTabRender` is only invoked from inside each stub component
// (i.e. lazily, at render time, long after this module's top-level code has
// run) — never eagerly by the `jest.mock` factory itself — so it's safe
// despite `jest.mock` factories being hoisted above other statements.
const mockTabRenderCounts: Record<string, number> = {};

const mockTrackTabRender = (name: string) => {
  mockTabRenderCounts[name] = (mockTabRenderCounts[name] ?? 0) + 1;
};

jest.mock('./tabs/NowTab', () => ({
  __esModule: true,
  default: () => {
    mockTrackTabRender('Now');
    return null;
  },
}));
jest.mock('./tabs/MacroTab', () => ({
  __esModule: true,
  default: () => {
    mockTrackTabRender('Macro');
    return null;
  },
}));
jest.mock('./tabs/RwasTab', () => ({
  __esModule: true,
  default: () => {
    mockTrackTabRender('RWAs');
    return null;
  },
}));
jest.mock('./tabs/CryptoTab', () => ({
  __esModule: true,
  default: () => {
    mockTrackTabRender('Crypto');
    return null;
  },
}));
jest.mock('./tabs/SportsTab', () => ({
  __esModule: true,
  default: () => {
    mockTrackTabRender('Sports');
    return null;
  },
}));
jest.mock('./tabs/DappsTab', () => ({
  __esModule: true,
  default: () => {
    mockTrackTabRender('Sites');
    return null;
  },
}));

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
import { TrendingViewSelectorsIDs } from './TrendingView.testIds';
import {
  selectChainId,
  selectPopularNetworkConfigurationsByCaipChainId,
  selectCustomNetworkConfigurationsByCaipChainId,
  selectNetworkConfigurationsByCaipChainId,
} from '../../../selectors/networkController';
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';
import { selectEnabledNetworksByNamespace } from '../../../selectors/networkEnablementController';
import { selectSelectedInternalAccountByScope } from '../../../selectors/multichainAccounts/accounts';
import { selectBasicFunctionalityEnabled } from '../../../selectors/settings';
import { useSelector } from 'react-redux';
import Routes from '../../../constants/navigation/Routes';

const Stack = createNativeStackNavigator();

const TrendingView: React.FC = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name={Routes.TRENDING_FEED} component={ExploreFeed} />
  </Stack.Navigator>
);

const renderTrendingView = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, cacheTime: 0 } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <TrendingView />
      </NavigationContainer>
    </QueryClientProvider>,
  );
};

jest.mock('../../../components/hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    isEnabled: mockIsEnabled,
  }),
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
    for (const key of Object.keys(mockTabRenderCounts)) {
      delete mockTabRenderCounts[key];
    }

    mockUseSelector.mockImplementation(createMockSelectorImplementation());
  });

  describe('browser button states', () => {
    it('displays add icon when no browser tabs are open', () => {
      mockUseSelector.mockImplementation(
        createMockSelectorImplementation({ browserTabsCount: 0 }),
      );

      const { getByTestId, queryByText } = renderTrendingView();

      const browserButton = getByTestId('trending-view-browser-button');
      expect(browserButton).toBeOnTheScreen();
      expect(queryByText(/^\d+$/)).toBeNull();
    });

    it('displays tab count when one browser tab is open', () => {
      mockUseSelector.mockImplementation(
        createMockSelectorImplementation({ browserTabsCount: 1 }),
      );

      const { getByText } = renderTrendingView();

      expect(getByText('1')).toBeOnTheScreen();
    });

    it('displays tab count when multiple browser tabs are open', () => {
      mockUseSelector.mockImplementation(
        createMockSelectorImplementation({ browserTabsCount: 5 }),
      );

      const { getByText } = renderTrendingView();

      expect(getByText('5')).toBeOnTheScreen();
    });

    it('displays tab count when many browser tabs are open', () => {
      mockUseSelector.mockImplementation(
        createMockSelectorImplementation({ browserTabsCount: 99 }),
      );

      const { getByText } = renderTrendingView();

      expect(getByText('99')).toBeOnTheScreen();
    });

    it('opens new tab with portfolio URL when no tabs exist', () => {
      mockUseSelector.mockImplementation(
        createMockSelectorImplementation({ browserTabsCount: 0 }),
      );

      const { getByTestId } = renderTrendingView();

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

    it('opens tabs view when tabs already exist', () => {
      mockUseSelector.mockImplementation(
        createMockSelectorImplementation({ browserTabsCount: 3 }),
      );

      const { getByTestId } = renderTrendingView();

      const browserButton = getByTestId('trending-view-browser-button');
      fireEvent.press(browserButton);

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.BROWSER.HOME,
        expect.objectContaining({
          screen: Routes.BROWSER.VIEW,
          params: expect.objectContaining({
            showTabsView: true,
            fromTrending: true,
          }),
        }),
      );
      // Should NOT pass newTabUrl when tabs exist
      expect(mockNavigate).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          params: expect.objectContaining({
            newTabUrl: expect.anything(),
          }),
        }),
      );
    });
  });

  it('renders title in header', () => {
    const { getByText } = renderTrendingView();

    expect(getByText('Explore')).toBeOnTheScreen();
  });

  it('wraps screen in SafeAreaView', () => {
    const { getByTestId } = renderTrendingView();

    expect(
      getByTestId(TrendingViewSelectorsIDs.EXPLORE_SAFE_AREA),
    ).toBeOnTheScreen();
  });

  it('renders HeaderRoot', () => {
    const { getByTestId } = renderTrendingView();

    expect(
      getByTestId(TrendingViewSelectorsIDs.EXPLORE_HEADER_ROOT),
    ).toBeOnTheScreen();
  });

  it('renders search bar button', () => {
    const { getByTestId } = renderTrendingView();

    const searchButton = getByTestId('explore-view-search-button');

    expect(searchButton).toBeOnTheScreen();
  });

  it('navigates to ExploreSearch route when search bar is pressed', () => {
    const { getByTestId } = renderTrendingView();

    const searchButton = getByTestId('explore-view-search-button');
    fireEvent.press(searchButton);

    expect(mockNavigate).toHaveBeenCalledWith('ExploreSearch');
  });

  describe('tab switching', () => {
    it('does not re-render an inactive tab just because the active tab changed', async () => {
      const { getByTestId } = renderTrendingView();

      // The "Now" tab (index 0) mounts first.
      await waitFor(() => {
        expect(mockTabRenderCounts.Now).toBeGreaterThanOrEqual(1);
      });
      const nowRenderCountBeforeSwitch = mockTabRenderCounts.Now;

      fireEvent.press(getByTestId('explore-tabs-bar-tab-1'));

      // The "Macro" tab (index 1) mounts once it becomes active.
      await waitFor(() => {
        expect(mockTabRenderCounts.Macro).toBeGreaterThanOrEqual(1);
      });

      // "Now" isn't a consumer of the active-tab context, so switching away
      // from it must not cause it to re-render.
      expect(mockTabRenderCounts.Now).toBe(nowRenderCountBeforeSwitch);
    });
  });

  describe('basic functionality toggle', () => {
    it('displays empty state when basic functionality is disabled', () => {
      mockUseSelector.mockImplementation(
        createMockSelectorImplementation({ basicFunctionalityEnabled: false }),
      );

      const { getByTestId } = renderTrendingView();

      expect(getByTestId('basic-functionality-empty-state')).toBeOnTheScreen();
    });
  });
});
