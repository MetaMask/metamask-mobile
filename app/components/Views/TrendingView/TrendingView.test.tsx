import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { analytics } from '../../../util/analytics/analytics';
import { EXPLORE_TAB_INDEX } from '../../../constants/navigation/exploreTabIndices';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockIsEnabled = jest.fn();
const mockAddListener = jest.fn(() => jest.fn());
const mockSetParams = jest.fn();
let mockRouteParams: {
  initialTab?: number | null;
  source?: string;
} = {};

// Replace every tab's content with a render-tracking stub so a tab-switch
// re-render regression test doesn't have to mock each tab's underlying
// feed hooks (usePerpsFeed, useTokensFeed, etc.) to render without crashing.
// `mockTrackTabRender` is only invoked from inside each stub component
// (i.e. lazily, at render time, long after this module's top-level code has
// run) — never eagerly by the `jest.mock` factory itself — so it's safe
// despite `jest.mock` factories being hoisted above other statements.
const mockTabRenderCounts: Record<string, number> = {};
const mockCryptoActiveTabLog: (string | undefined)[] = [];

type TrackedEvent = Parameters<
  jest.MockedFunction<typeof analytics.trackEvent>
>[0];

const tabSwitchedEvents = (): TrackedEvent[] =>
  (
    analytics.trackEvent as jest.MockedFunction<typeof analytics.trackEvent>
  ).mock.calls
    .map(([event]) => event)
    .filter((event) => event.properties?.interaction_type === 'tab_switched');

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
jest.mock('./tabs/PerpsTab', () => ({
  __esModule: true,
  default: () => {
    mockTrackTabRender('Perps');
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
jest.mock('./tabs/CryptoTab', () => {
  const { useExploreActiveTab } = jest.requireActual(
    './ExploreActiveTabContext',
  );
  const CryptoTabStub: React.FC = () => {
    mockTrackTabRender('Crypto');
    mockCryptoActiveTabLog.push(useExploreActiveTab());
    return null;
  };
  return {
    __esModule: true,
    default: CryptoTabStub,
  };
});
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

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  const ReactActual = jest.requireActual('react');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      addListener: mockAddListener,
      setParams: mockSetParams,
    }),
    useRoute: () => ({ params: mockRouteParams, name: 'TrendingView' }),
    useFocusEffect: (callback: () => void | (() => void)) => {
      ReactActual.useEffect(() => callback(), [callback]);
    },
  };
});

let mockPagerProps:
  | {
      initialPage?: number;
      onPageSelected?: (e: { nativeEvent: { position: number } }) => void;
      onPageScrollStateChanged?: (e: {
        nativeEvent: { pageScrollState: 'idle' | 'dragging' | 'settling' };
      }) => void;
    }
  | undefined;
let mockPagerInitialPage: number | undefined;

const settlePager = (): void => {
  const onPageScrollStateChanged = mockPagerProps?.onPageScrollStateChanged;
  if (!onPageScrollStateChanged) {
    throw new Error(
      'settlePager: pager mock not wired — did react-native-tab-view stop forwarding onPageScrollStateChanged?',
    );
  }
  act(() => {
    onPageScrollStateChanged({
      nativeEvent: { pageScrollState: 'idle' },
    });
  });
};

const swipeToPage = (position: number): void => {
  const onPageSelected = mockPagerProps?.onPageSelected;
  if (!onPageSelected) {
    throw new Error(
      'swipeToPage: pager mock not wired — did react-native-tab-view stop forwarding onPageSelected?',
    );
  }
  act(() => {
    onPageSelected({ nativeEvent: { position } });
  });
};

jest.mock('react-native-pager-view', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const MockPagerView = ReactActual.forwardRef(
    (
      props: {
        children?: React.ReactNode;
        initialPage?: number;
        onPageSelected?: (e: { nativeEvent: { position: number } }) => void;
        testID?: string;
      },
      _ref: React.Ref<unknown>,
    ) => {
      mockPagerProps = props;
      mockPagerInitialPage = props.initialPage;
      return <View testID={props.testID}>{props.children}</View>;
    },
  );
  MockPagerView.displayName = 'MockPagerView';
  return { __esModule: true, default: MockPagerView };
});

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

import { EXPLORE_TAB_DEFINITIONS, ExploreFeed } from './TrendingView';
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
import { selectExploreBrandRefreshEnabled } from '../../../selectors/featureFlagController/exploreBrandRefresh';
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
    mockRouteParams = {};
    mockPagerProps = undefined;
    mockPagerInitialPage = undefined;
    for (const key of Object.keys(mockTabRenderCounts)) {
      delete mockTabRenderCounts[key];
    }
    mockCryptoActiveTabLog.length = 0;

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

    const searchButton = getByTestId(
      TrendingViewSelectorsIDs.EXPLORE_VIEW_SEARCH_BUTTON,
    );

    expect(searchButton).toBeOnTheScreen();
  });

  it('keeps the muted search bar when the Explore brand refresh is off', () => {
    const { queryByTestId } = renderTrendingView();

    expect(
      queryByTestId(TrendingViewSelectorsIDs.EXPLORE_SEARCH_BAR_GLASS),
    ).not.toBeOnTheScreen();
  });

  it('draws the search bar as glass when the Explore brand refresh is on', () => {
    mockUseIsGlassSurfaceEnabled.mockReturnValue(true);

    const { getByTestId } = renderTrendingView();

    expect(mockUseIsGlassSurfaceEnabled).toHaveBeenCalledWith(
      selectExploreBrandRefreshEnabled,
    );
    expect(
      getByTestId(TrendingViewSelectorsIDs.EXPLORE_SEARCH_BAR_GLASS),
    ).toBeOnTheScreen();
  });

  it('draws the browser tabs button as glass when the Explore brand refresh is on', () => {
    mockUseIsGlassSurfaceEnabled.mockReturnValue(true);
    mockUseIsExploreHeaderRefreshEnabled.mockReturnValue(true);
    mockUseSelector.mockImplementation(
      createMockSelectorImplementation({ browserTabsCount: 2 }),
    );

    const { getByTestId } = renderTrendingView();

    expect(
      getByTestId(TrendingViewSelectorsIDs.BROWSER_TABS_BUTTON_GLASS),
    ).toBeOnTheScreen();
  });

  it('navigates to ExploreSearch route when search bar is pressed', () => {
    const { getByTestId } = renderTrendingView();

    const searchButton = getByTestId(
      TrendingViewSelectorsIDs.EXPLORE_VIEW_SEARCH_BUTTON,
    );
    fireEvent.press(searchButton);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.EXPLORE_SEARCH, {
      entryPoint: 'explore',
    });
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
    const lastActiveTabSeenByCrypto = (): string | undefined =>
      mockCryptoActiveTabLog[mockCryptoActiveTabLog.length - 1];

    it('renders the tab bar and pages under the explore-tabs testIDs', () => {
      const { getByTestId } = renderTrendingView();

      expect(getByTestId('explore-tabs')).toBeOnTheScreen();
      expect(getByTestId('explore-tabs-bar')).toBeOnTheScreen();
      expect(getByTestId('explore-tabs-bar-tab-0')).toBeOnTheScreen();
      expect(getByTestId('explore-tabs-bar-tab-5')).toBeOnTheScreen();
    });

    it('pairs EXPLORE_TAB_DEFINITIONS order with EXPLORE_TAB_INDEX', () => {
      expect(EXPLORE_TAB_DEFINITIONS.map(({ name }) => name)).toEqual([
        'Now',
        'Crypto',
        'Perps',
        'RWAs',
        'Sports',
        'Sites',
      ]);
      Object.entries(EXPLORE_TAB_INDEX).forEach(
        ([constantName, tabIndex]): void => {
          expect(EXPLORE_TAB_DEFINITIONS[tabIndex]?.name.toLowerCase()).toBe(
            constantName.toLowerCase(),
          );
        },
      );
    });

    it('does not re-render an inactive tab just because the active tab changed', async () => {
      const { getByTestId } = renderTrendingView();

      // The "Now" tab (index 0) mounts first.
      await waitFor(() => {
        expect(mockTabRenderCounts.Now).toBeGreaterThanOrEqual(1);
      });
      const nowRenderCountBeforeSwitch = mockTabRenderCounts.Now;

      fireEvent.press(getByTestId('explore-tabs-bar-tab-2'));

      // The "Perps" tab (index 2) mounts once it becomes active.
      await waitFor(() => {
        expect(mockTabRenderCounts.Perps).toBeGreaterThanOrEqual(1);
      });

      // "Now" isn't a consumer of the active-tab context, so switching away
      // from it must not cause it to re-render.
      expect(mockTabRenderCounts.Now).toBe(nowRenderCountBeforeSwitch);
    });

    it('fires tab_switched with the previous tab when a bar tab is pressed', () => {
      const { getByTestId } = renderTrendingView();

      fireEvent.press(getByTestId('explore-tabs-bar-tab-2'));

      expect(tabSwitchedEvents()).toEqual([
        expect.objectContaining({
          properties: {
            interaction_type: 'tab_switched',
            tab_name: 'Perps',
            previous_tab: 'Now',
          },
        }),
      ]);
      expect(tabSwitchedEvents()[0]?.name).toBe(
        MetaMetricsEvents.EXPLORE_INTERACTED.category,
      );
    });

    it('does not re-fire tab_switched when the active tab is pressed again', () => {
      const { getByTestId } = renderTrendingView();

      fireEvent.press(getByTestId('explore-tabs-bar-tab-2'));
      fireEvent.press(getByTestId('explore-tabs-bar-tab-2'));

      expect(tabSwitchedEvents()).toHaveLength(1);
    });

    it('activates a first-time tab press immediately and a revisited tap only after the pager settles', async () => {
      const { getByTestId } = renderTrendingView();

      fireEvent.press(getByTestId('explore-tabs-bar-tab-1'));
      await waitFor(() => {
        expect(mockTabRenderCounts.Crypto).toBeGreaterThanOrEqual(1);
      });
      expect(lastActiveTabSeenByCrypto()).toBe('Crypto');

      fireEvent.press(getByTestId('explore-tabs-bar-tab-0'));
      expect(lastActiveTabSeenByCrypto()).toBe('Crypto');

      settlePager();
      expect(lastActiveTabSeenByCrypto()).toBe('Now');
    });

    it('activates a swiped-to tab immediately', () => {
      const { getByTestId } = renderTrendingView();

      fireEvent.press(getByTestId('explore-tabs-bar-tab-1'));
      expect(lastActiveTabSeenByCrypto()).toBe('Crypto');

      swipeToPage(EXPLORE_TAB_INDEX.RWAS);

      expect(mockTabRenderCounts.RWAs).toBeGreaterThanOrEqual(1);
      expect(lastActiveTabSeenByCrypto()).toBe('RWAs');
      expect(tabSwitchedEvents()).toEqual([
        expect.objectContaining({
          properties: {
            interaction_type: 'tab_switched',
            tab_name: 'Crypto',
            previous_tab: 'Now',
          },
        }),
        expect.objectContaining({
          properties: {
            interaction_type: 'tab_switched',
            tab_name: 'RWAs',
            previous_tab: 'Crypto',
          },
        }),
      ]);
    });
  });

  describe('deep-linked initial tab', () => {
    it('seeds the pager on the requested tab instead of jumping after mount', () => {
      mockRouteParams = {
        initialTab: EXPLORE_TAB_INDEX.PERPS,
        source: 'deeplink',
      };
      renderTrendingView();

      expect(mockPagerInitialPage).toBe(EXPLORE_TAB_INDEX.PERPS);
      expect(mockTabRenderCounts.Perps).toBeGreaterThanOrEqual(1);
      expect(mockTabRenderCounts.Now).toBeUndefined();
    });

    it('switches to the requested tab and attributes the switch to the deeplink source', () => {
      mockRouteParams = {
        initialTab: EXPLORE_TAB_INDEX.SITES,
        source: 'deeplink',
      };
      const { getByTestId } = renderTrendingView();

      expect(mockTabRenderCounts.Sites).toBeGreaterThanOrEqual(1);
      expect(getByTestId('explore-tabs-bar-tab-5')).toBeOnTheScreen();
      expect(tabSwitchedEvents()).toEqual([
        expect.objectContaining({
          properties: {
            interaction_type: 'tab_switched',
            tab_name: 'Sites',
            previous_tab: 'Now',
            source: 'deeplink',
          },
        }),
      ]);
      expect(mockSetParams).toHaveBeenCalledWith({
        initialTab: null,
        source: undefined,
      });
    });

    it('reports the seeded tab as previous_tab on the next switch after a sourced deeplink', () => {
      mockRouteParams = {
        initialTab: EXPLORE_TAB_INDEX.PERPS,
        source: 'deeplink',
      };
      const { getByTestId } = renderTrendingView();

      fireEvent.press(getByTestId('explore-tabs-bar-tab-1'));

      expect(mockTabRenderCounts.Crypto).toBeGreaterThanOrEqual(1);
      expect(tabSwitchedEvents()).toEqual([
        expect.objectContaining({
          properties: {
            interaction_type: 'tab_switched',
            tab_name: 'Perps',
            previous_tab: 'Now',
            source: 'deeplink',
          },
        }),
        expect.objectContaining({
          properties: {
            interaction_type: 'tab_switched',
            tab_name: 'Crypto',
            previous_tab: 'Perps',
          },
        }),
      ]);
    });

    it('reports the seeded tab as previous_tab on the next switch after an unsourced deeplink', () => {
      mockRouteParams = { initialTab: EXPLORE_TAB_INDEX.PERPS };
      const { getByTestId } = renderTrendingView();

      fireEvent.press(getByTestId('explore-tabs-bar-tab-1'));

      expect(mockTabRenderCounts.Crypto).toBeGreaterThanOrEqual(1);
      expect(tabSwitchedEvents()).toEqual([
        expect.objectContaining({
          properties: {
            interaction_type: 'tab_switched',
            tab_name: 'Perps',
            previous_tab: 'Now',
          },
        }),
        expect.objectContaining({
          properties: {
            interaction_type: 'tab_switched',
            tab_name: 'Crypto',
            previous_tab: 'Perps',
          },
        }),
      ]);
    });

    it('fires the deeplink-attributed switch once when the requested tab is already active', () => {
      mockRouteParams = {
        initialTab: EXPLORE_TAB_INDEX.NOW,
        source: 'deeplink',
      };
      renderTrendingView();

      expect(tabSwitchedEvents()).toEqual([
        expect.objectContaining({
          properties: {
            interaction_type: 'tab_switched',
            tab_name: 'Now',
            previous_tab: 'Now',
            source: 'deeplink',
          },
        }),
      ]);
      expect(mockSetParams).toHaveBeenCalledWith({
        initialTab: null,
        source: undefined,
      });
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
