import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { analytics } from '../../../util/analytics/analytics';

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
    const { ScrollingChrome } = jest.requireActual(
      '../../Nav/Main/FixedTabNav/ScrollingChrome',
    ) as typeof import('../../Nav/Main/FixedTabNav/ScrollingChrome');
    return <ScrollingChrome />;
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

jest.mock('../../Nav/Main/FixedTabNav/HubProfileButton', () => {
  const { Pressable } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <Pressable testID="profile-button" />,
  };
});

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
    <Stack.Screen name={Routes.TRENDING_VIEW} component={ExploreFeed} />
  </Stack.Navigator>
);

const renderTrendingView = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
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

const mockUseIsGlassSurfaceEnabled = jest.fn();
jest.mock('../../hooks/useIsGlassSurfaceEnabled', () => ({
  useIsGlassSurfaceEnabled: (selectFlag: unknown) =>
    mockUseIsGlassSurfaceEnabled(selectFlag),
}));

const mockUseIsExploreHeaderRefreshEnabled = jest.fn();
jest.mock('./hooks/useIsExploreHeaderRefreshEnabled', () => ({
  useIsExploreHeaderRefreshEnabled: () =>
    mockUseIsExploreHeaderRefreshEnabled(),
}));

jest.mock('../../../util/analytics/analytics', () => ({
  analytics: {
    trackEvent: jest.fn(),
  },
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
    mockUseIsGlassSurfaceEnabled.mockReturnValue(false);
    mockUseIsExploreHeaderRefreshEnabled.mockReturnValue(false);
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

  it('renders the profile avatar instead of a title', () => {
    const { getByTestId, queryByText } = renderTrendingView();

    expect(getByTestId('profile-button')).toBeOnTheScreen();
    expect(queryByText('Trade')).toBeNull();
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

    const searchButton = getByTestId(
      TrendingViewSelectorsIDs.EXPLORE_VIEW_SEARCH_BUTTON,
    );

    expect(searchButton).toBeOnTheScreen();
  });

  it('groups search and the tab button in one header capsule', () => {
    mockUseSelector.mockImplementation(
      createMockSelectorImplementation({ browserTabsCount: 2 }),
    );

    const { getByTestId, queryByTestId } = renderTrendingView();
    const capsule = getByTestId(
      TrendingViewSelectorsIDs.EXPLORE_SEARCH_BAR_GLASS,
    );

    expect(capsule).toBeOnTheScreen();
    expect(capsule).toContainElement(
      getByTestId(TrendingViewSelectorsIDs.EXPLORE_VIEW_SEARCH_BUTTON),
    );
    expect(capsule).toContainElement(
      getByTestId('trending-view-browser-button'),
    );
    expect(
      queryByTestId(TrendingViewSelectorsIDs.BROWSER_TABS_BUTTON_GLASS),
    ).toBeNull();
  });

  it('navigates to ExploreSearch route when search bar is pressed', () => {
    const { getByTestId } = renderTrendingView();

    const searchButton = getByTestId(
      TrendingViewSelectorsIDs.EXPLORE_VIEW_SEARCH_BUTTON,
    );
    fireEvent.press(searchButton);

    expect(mockNavigate).toHaveBeenCalledWith('ExploreSearch');
  });

  it('tracks the search opened event with the explore entry point', () => {
    const { getByTestId } = renderTrendingView();

    fireEvent.press(
      getByTestId(TrendingViewSelectorsIDs.EXPLORE_VIEW_SEARCH_BUTTON),
    );

    const openedEvent = (
      analytics.trackEvent as jest.MockedFunction<typeof analytics.trackEvent>
    ).mock.calls
      .map(([event]) => event)
      .find((event) => event.properties?.interaction_type === 'opened');

    expect(openedEvent?.name).toBe(
      MetaMetricsEvents.EXPLORE_SEARCH_INTERACTED.category,
    );
    expect(openedEvent?.properties).toEqual({
      interaction_type: 'opened',
      search_query: '',
      entry_point: 'explore',
      search_session_id: expect.any(String),
    });
  });

  describe('tab switching', () => {
    it('does not show the Explore category tabs', async () => {
      const { getByTestId, queryByTestId } = renderTrendingView();

      await waitFor(() => {
        expect(mockTabRenderCounts.Now).toBeGreaterThanOrEqual(1);
      });

      expect(queryByTestId('explore-tabs-bar')).toBeNull();
      expect(getByTestId('explore-tabs-content')).toBeOnTheScreen();
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
