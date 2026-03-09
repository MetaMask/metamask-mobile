import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
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
import { strings } from '../../../../locales/i18n';
import AppConstants from '../../../core/AppConstants';
import { useBuildPortfolioUrl } from '../../hooks/useBuildPortfolioUrl';
import { useTheme } from '../../../util/theme';
import Routes from '../../../constants/navigation/Routes';
import ExploreSearchBar from './components/ExploreSearchBar/ExploreSearchBar';
import QuickActions from './components/QuickActions/QuickActions';
import SectionHeader from './components/SectionHeader/SectionHeader';
import { useHomeSections, SectionId } from './sections.config';
import { selectBasicFunctionalityEnabled } from '../../../selectors/settings';
import BasicFunctionalityEmptyState from '../../UI/BasicFunctionality/BasicFunctionalityEmptyState/BasicFunctionalityEmptyState';
import TrendingFeedSessionManager from '../../UI/Trending/services/TrendingFeedSessionManager';
import Section, { RefreshConfig } from './components/Sections/Section';
import { TrendingViewSelectorsIDs } from './TrendingView.testIds';

const curriedSetSectionState =
  (setState: (updater: (prev: Set<SectionId>) => Set<SectionId>) => void) =>
  (sectionId: SectionId) =>
  (isActive: boolean): void => {
    setState((prev) => {
      const newSet = new Set(prev);

      if (isActive) {
        newSet.add(sectionId);
      } else {
        newSet.delete(sectionId);
      }

      return newSet;
    });
  };

/**
 * Custom hook to track boolean state for each section
 * Returns the Set of sections with that state and callbacks to update them
 */
const useSectionStateTracker = (
  sections: { id: SectionId }[],
): {
  sectionsWithState: Set<SectionId>;
  callbacks: Record<SectionId, (isActive: boolean) => void>;
} => {
  const [activeSections, setActiveSections] = useState<Set<SectionId>>(
    new Set(),
  );

  const callbacks = useMemo(() => {
    const result = {} as Record<SectionId, (isActive: boolean) => void>;
    sections.forEach((s) => {
      result[s.id] = curriedSetSectionState(setActiveSections)(s.id);
    });
    return result;
  }, [sections]);

  return { sectionsWithState: activeSections, callbacks };
};

export const ExploreFeed: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const buildPortfolioUrlWithMetrics = useBuildPortfolioUrl();
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshConfig, setRefreshConfig] = useState<RefreshConfig>({
    trigger: 0,
    silentRefresh: true,
  });

  const homeSections = useHomeSections();

  // Track which sections have empty data (for QuickActions empty state)
  const { sectionsWithState: emptySections, callbacks: emptyStateCallbacks } =
    useSectionStateTracker(homeSections);

  const noopLoadingState = useCallback((_isLoading: boolean) => undefined, []);

  const sessionManager = TrendingFeedSessionManager.getInstance();

  // REMOVED FOR NOW (https://consensys.slack.com/archives/C07NF2K42LE/p1766152712027759?thread_ts=1766135783.241539&cid=C07NF2K42LE)
  // Trigger refresh only when navigating to an already-mounted screen
  // useEffect(() => {
  //   const params = route.params as { refresh?: boolean } | undefined;

  //   // Skip refresh on first mount
  //   if (isFirstMount.current) {
  //     isFirstMount.current = false;
  //     return;
  //   }

  //   if (params?.refresh === true) {
  //     // Silent refresh - don't show skeletons
  //     setRefreshConfig((prev) => ({
  //       trigger: prev.trigger + 1,
  //       silentRefresh: false,
  //     }));
  //   }
  // }, [route.params]);

  // Initialize session and enable AppState listener on mount
  useEffect(() => {
    // Enable AppState listener to detect app backgrounding
    sessionManager.enableAppStateListener();

    // Start session
    sessionManager.startSession('trending_feed');

    return () => {
      // End session and disable listener on unmount
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
      // If tabs exist, show the tabs view directly
      navigation.navigate(Routes.BROWSER.HOME, {
        screen: Routes.BROWSER.VIEW,
        params: {
          showTabsView: true,
          timestamp: Date.now(),
          fromTrending: true,
        },
      });
    } else {
      // If no tabs exist, open a new tab with portfolio URL
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

  // Clean up timeout when component unmounts or refreshing changes
  useEffect(() => {
    if (refreshing) {
      const timeoutId = setTimeout(() => {
        setRefreshing(false);
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [refreshing]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // Pull-to-refresh - show skeletons
    setRefreshConfig((prev) => ({
      trigger: prev.trigger + 1,
      silentRefresh: true,
    }));
  }, []);

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={tw.style('flex-1 bg-default')}
      testID={TrendingViewSelectorsIDs.EXPLORE_SAFE_AREA}
    >
      <HeaderRoot
        title={strings('trending.title')}
        includesTopInset
        testID={TrendingViewSelectorsIDs.EXPLORE_HEADER_ROOT}
      />

      <Box twClassName="gap-4 flex-1">
        <Box twClassName="flex-row items-center gap-2 px-4">
          <Box twClassName="flex-1">
            <ExploreSearchBar type="button" onPress={handleSearchPress} />
          </Box>

          <TouchableOpacity
            onPress={handleBrowserPress}
            testID="trending-view-browser-button"
          >
            {browserTabsCount > 0 ? (
              <Box twClassName="rounded-md items-center justify-center h-8 w-8 border-2 border-text-default">
                <Text variant={TextVariant.BodyLg}>{browserTabsCount}</Text>
              </Box>
            ) : (
              <Icon name={IconName.Explore} size={IconSize.Xl} />
            )}
          </TouchableOpacity>
        </Box>

        {isBasicFunctionalityEnabled ? (
          <ScrollView
            testID={TrendingViewSelectorsIDs.TRENDING_FEED_SCROLL_VIEW}
            style={tw.style('flex-1 px-4')}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.icon.default}
                colors={[colors.primary.default]}
              />
            }
          >
            <QuickActions emptySections={emptySections} />

            {homeSections.map((section) => {
              // Hide section visually but keep mounted so it can report when data arrives
              const isHidden = emptySections.has(section.id);

              const sectionComponent = (
                <Section
                  sectionId={section.id}
                  refreshConfig={refreshConfig}
                  toggleSectionEmptyState={emptyStateCallbacks[section.id]}
                  toggleSectionLoadingState={noopLoadingState}
                />
              );

              return (
                <Box
                  key={section.id}
                  twClassName={isHidden ? 'hidden' : undefined}
                >
                  <SectionHeader sectionId={section.id} />
                  {section.SectionWrapper ? (
                    <section.SectionWrapper>
                      {sectionComponent}
                    </section.SectionWrapper>
                  ) : (
                    sectionComponent
                  )}
                </Box>
              );
            })}
          </ScrollView>
        ) : (
          <BasicFunctionalityEmptyState />
        )}
      </Box>
    </SafeAreaView>
  );
};
