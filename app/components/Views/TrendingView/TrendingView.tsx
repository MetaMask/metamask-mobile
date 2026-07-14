import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { TouchableOpacity } from 'react-native';
import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  IconName,
  Icon,
  IconSize,
} from '@metamask/design-system-react-native';
import HeaderRoot from '../../../component-library/components-temp/HeaderRoot';
import TabsList from '../../../component-library/components-temp/Tabs/TabsList/TabsList';
import {
  TabsListRef,
  TabViewProps,
} from '../../../component-library/components-temp/Tabs/TabsList/TabsList.types';
import { strings } from '../../../../locales/i18n';
import AppConstants from '../../../core/AppConstants';
import { useBuildPortfolioUrl } from '../../hooks/useBuildPortfolioUrl';
import Routes from '../../../constants/navigation/Routes';
import { selectBasicFunctionalityEnabled } from '../../../selectors/settings';
import BasicFunctionalityEmptyState from '../../UI/BasicFunctionality/BasicFunctionalityEmptyState/BasicFunctionalityEmptyState';
import TrendingFeedSessionManager from '../../UI/Trending/services/TrendingFeedSessionManager';
import ExploreSearchBar from './components/ExploreSearchBar/ExploreSearchBar';
import { ExploreActiveTabProvider } from './ExploreActiveTabContext';
import { useExploreRefresh } from './hooks/useExploreRefresh';
import NowTab from './tabs/NowTab';
import MacroTab from './tabs/MacroTab';
import RwasTab from './tabs/RwasTab';
import CryptoTab from './tabs/CryptoTab';
import SportsTab from './tabs/SportsTab';
import DappsTab from './tabs/DappsTab';
import { TrendingViewSelectorsIDs } from './TrendingView.testIds';
import {
  trackExploreInteracted,
  type ExploreTabName,
} from './search/analytics';
import { EXPLORE_TAB_INDEX } from '../../../constants/navigation/exploreTabIndices';

const TAB_NAMES: ExploreTabName[] = [
  'Now',
  'Macro',
  'RWAs',
  'Crypto',
  'Sports',
  'Sites',
];

export { EXPLORE_TAB_INDEX } from '../../../constants/navigation/exploreTabIndices';

export interface ExploreFeedRouteParams {
  initialTab?: number | null;
  /** Entry surface for `tab_switched` analytics (e.g. `deeplink`). */
  source?: string;
}

const useExploreTabNavigationEffect = (opts: {
  tabsListRef: React.RefObject<TabsListRef | null>;
  tabNames: ExploreTabName[];
  pendingExploreEntrySourceRef: React.MutableRefObject<string | undefined>;
  previousTabRef: React.MutableRefObject<ExploreTabName>;
}) => {
  const {
    tabsListRef,
    tabNames,
    pendingExploreEntrySourceRef,
    previousTabRef,
  } = opts;
  const route =
    useRoute<RouteProp<{ params: ExploreFeedRouteParams }, 'params'>>();
  const { setParams } = useNavigation();
  const initialTabIndex = Object.values(EXPLORE_TAB_INDEX).find(
    (tab) => tab === route.params?.initialTab,
  );
  const entrySource = route.params?.source;

  useFocusEffect(
    useCallback(() => {
      if (initialTabIndex === undefined) {
        return;
      }

      const destinationTab = tabNames[initialTabIndex];
      if (entrySource) {
        pendingExploreEntrySourceRef.current = entrySource;
      }

      const currentIndex = tabsListRef.current?.getCurrentIndex();
      tabsListRef.current?.goToTabIndex(initialTabIndex);

      // goToTabIndex only invokes onChangeTab when the tab actually changes.
      if (entrySource && destinationTab && currentIndex === initialTabIndex) {
        pendingExploreEntrySourceRef.current = undefined;
        trackExploreInteracted({
          interaction_type: 'tab_switched',
          tab_name: destinationTab,
          previous_tab: previousTabRef.current,
          source: entrySource,
        });
      } else if (
        entrySource &&
        pendingExploreEntrySourceRef.current === entrySource
      ) {
        // Tab switch did not run (e.g. tabs not mounted) — discard stale source.
        pendingExploreEntrySourceRef.current = undefined;
      }

      setParams?.({ initialTab: null, source: undefined });
    }, [
      entrySource,
      initialTabIndex,
      pendingExploreEntrySourceRef,
      previousTabRef,
      setParams,
      tabNames,
      tabsListRef,
    ]),
  );
};

interface ExploreTabsProps extends PropsWithChildren {
  tabsListRef: React.RefObject<TabsListRef | null>;
  previousTabRef: React.MutableRefObject<ExploreTabName>;
  pendingExploreEntrySourceRef: React.MutableRefObject<string | undefined>;
}

/**
 * Owns `activeTab` state and renders the `ExploreActiveTabProvider`/
 * `TabsList` pair, so a tab switch only re-renders this small subtree
 * instead of all of `ExploreFeed`.
 *
 * `children` (the six tab elements) is created once by the caller and
 * forwarded here untouched — never re-created inline — so passing it
 * through `TabsList` doesn't change its identity when this component
 * re-renders. `TabsList` reads `tab.content` straight off that same
 * `children` reference, so React bails out of re-rendering the tab content
 * subtrees on a tab switch; only components that read `useExploreActiveTab`
 * (e.g. `PerpsBlock`) update, matching the context's intent.
 */
const ExploreTabs: React.FC<ExploreTabsProps> = ({
  tabsListRef,
  previousTabRef,
  pendingExploreEntrySourceRef,
  children,
}) => {
  const [activeTab, setActiveTab] = useState<ExploreTabName>('Now');

  const handleTabChange = useCallback(
    ({ i }: { i: number }) => {
      const destinationTab = TAB_NAMES[i];
      if (!destinationTab) return;
      const source = pendingExploreEntrySourceRef.current;
      pendingExploreEntrySourceRef.current = undefined;
      trackExploreInteracted({
        interaction_type: 'tab_switched',
        tab_name: destinationTab,
        previous_tab: previousTabRef.current,
        ...(source ? { source } : {}),
      });
      previousTabRef.current = destinationTab;
      setActiveTab(destinationTab);
    },
    [pendingExploreEntrySourceRef, previousTabRef],
  );

  return (
    <ExploreActiveTabProvider activeTab={activeTab}>
      <TabsList
        ref={tabsListRef}
        testID="explore-tabs"
        tabsListContentTwClassName="px-0 mt-0"
        onChangeTab={handleTabChange}
      >
        {children}
      </TabsList>
    </ExploreActiveTabProvider>
  );
};

export const ExploreFeed: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const buildPortfolioUrlWithMetrics = useBuildPortfolioUrl();
  const tabProps = useExploreRefresh();
  const tabsListRef = useRef<TabsListRef>(null);
  const sessionManager = TrendingFeedSessionManager.getInstance();
  const previousTabRef = useRef<ExploreTabName>('Now');
  const pendingExploreEntrySourceRef = useRef<string | undefined>(undefined);

  // Handle tab navigation from route params
  useExploreTabNavigationEffect({
    tabsListRef,
    tabNames: TAB_NAMES,
    pendingExploreEntrySourceRef,
    previousTabRef,
  });

  // Initialize session and enable AppState listener on mount
  useEffect(() => {
    sessionManager.enableAppStateListener();
    sessionManager.startSession('trending_feed');

    return () => {
      sessionManager.endSession();
      sessionManager.disableAppStateListener();
    };
  }, [sessionManager]);

  const portfolioUrl = buildPortfolioUrlWithMetrics(AppConstants.PORTFOLIO.URL);

  const browserTabsCount = useSelector(
    (state: { browser: { tabs: unknown[] } }) => state.browser.tabs.length,
  );
  const isBasicFunctionalityEnabled = useSelector(
    selectBasicFunctionalityEnabled,
  );

  const handleBrowserPress = useCallback(() => {
    if (browserTabsCount > 0) {
      navigation.navigate(Routes.BROWSER.HOME, {
        screen: Routes.BROWSER.VIEW,
        params: {
          showTabsView: true,
          timestamp: Date.now(),
          fromTrending: true,
        },
      });
    } else {
      navigation.navigate(Routes.BROWSER.HOME, {
        screen: Routes.BROWSER.VIEW,
        params: {
          newTabUrl: portfolioUrl.href,
          timestamp: Date.now(),
          fromTrending: true,
        },
      });
    }
  }, [navigation, portfolioUrl.href, browserTabsCount]);

  const handleSearchPress = useCallback(() => {
    navigation.navigate(Routes.EXPLORE_SEARCH);
  }, [navigation]);

  // Created once per `tabProps` identity (not on every render) so
  // `ExploreTabs` can forward this array through `TabsList` unchanged on a
  // tab switch — see `ExploreTabs` for why that reference stability is what
  // keeps every loaded feed from re-rendering when only the active tab
  // changes.
  const tabElements = useMemo(
    () => [
      <Box
        key="now"
        twClassName="flex-1"
        {...({ tabLabel: strings('trending.tabs.now') } as TabViewProps)}
      >
        <NowTab {...tabProps} />
      </Box>,
      <Box
        key="macro"
        twClassName="flex-1"
        {...({ tabLabel: strings('trending.tabs.macro') } as TabViewProps)}
      >
        <MacroTab {...tabProps} />
      </Box>,
      <Box
        key="rwas"
        twClassName="flex-1"
        {...({ tabLabel: strings('trending.tabs.rwas') } as TabViewProps)}
      >
        <RwasTab {...tabProps} />
      </Box>,
      <Box
        key="crypto"
        twClassName="flex-1"
        {...({ tabLabel: strings('trending.tabs.crypto') } as TabViewProps)}
      >
        <CryptoTab {...tabProps} />
      </Box>,
      <Box
        key="sports"
        twClassName="flex-1"
        {...({ tabLabel: strings('trending.tabs.sports') } as TabViewProps)}
      >
        <SportsTab {...tabProps} />
      </Box>,
      <Box
        key="dapps"
        twClassName="flex-1"
        {...({ tabLabel: strings('trending.tabs.dapps') } as TabViewProps)}
      >
        <DappsTab {...tabProps} />
      </Box>,
    ],
    [tabProps],
  );

  return (
    <Box
      style={tw.style('flex-1 bg-default')}
      testID={TrendingViewSelectorsIDs.EXPLORE_SAFE_AREA}
    >
      <HeaderRoot
        includesTopInset
        title={strings('trending.title')}
        testID={TrendingViewSelectorsIDs.EXPLORE_HEADER_ROOT}
      />

      <Box twClassName="gap-4 flex-1">
        <Box twClassName="mt-2 mb-2 flex-row items-center gap-2 px-4">
          <Box twClassName="flex-1">
            <ExploreSearchBar type="button" onPress={handleSearchPress} />
          </Box>

          <TouchableOpacity
            onPress={handleBrowserPress}
            testID="trending-view-browser-button"
          >
            {browserTabsCount > 0 ? (
              <Box twClassName="rounded-lg items-center justify-center h-8 w-8 border border-muted bg-section">
                <Text variant={TextVariant.BodyMd}>{browserTabsCount}</Text>
              </Box>
            ) : (
              <Icon name={IconName.Explore} size={IconSize.Xl} />
            )}
          </TouchableOpacity>
        </Box>

        {!isBasicFunctionalityEnabled ? (
          <BasicFunctionalityEmptyState />
        ) : (
          <ExploreTabs
            tabsListRef={tabsListRef}
            previousTabRef={previousTabRef}
            pendingExploreEntrySourceRef={pendingExploreEntrySourceRef}
          >
            {tabElements}
          </ExploreTabs>
        )}
      </Box>
    </Box>
  );
};
