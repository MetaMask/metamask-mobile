import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { strings } from '../../../../locales/i18n';
import AppConstants from '../../../core/AppConstants';
import { useBuildPortfolioUrl } from '../../hooks/useBuildPortfolioUrl';
import { useTheme } from '../../../util/theme';
import Routes from '../../../constants/navigation/Routes';
import ExploreSearchBar from './ExploreSearchBar/ExploreSearchBar';
import QuickActions from './components/QuickActions/QuickActions';
import SectionHeader from './components/SectionHeader/SectionHeader';
import { HOME_SECTIONS_ARRAY, SectionId } from './config/sections.config';
import { selectBasicFunctionalityEnabled } from '../../../selectors/settings';
import BasicFunctionalityEmptyState from '../../UI/BasicFunctionality/BasicFunctionalityEmptyState/BasicFunctionalityEmptyState';
import TrendingFeedSessionManager from '../../UI/Trending/services/TrendingFeedSessionManager';

export const ExploreFeed: React.FC = () => {
  const tw = useTailwind();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const buildPortfolioUrlWithMetrics = useBuildPortfolioUrl();
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Track which sections have empty data
  const [emptySections, setEmptySections] = useState<Set<SectionId>>(new Set());
  const sessionManager = TrendingFeedSessionManager.getInstance();

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

  const sectionCallbacks = useMemo(() => {
    const callbacks = {} as Record<SectionId, (isEmpty: boolean) => void>;
    HOME_SECTIONS_ARRAY.forEach((section) => {
      callbacks[section.id] = (isEmpty: boolean) => {
        setEmptySections((prev) => {
          const next = new Set(prev);
          if (isEmpty) {
            next.add(section.id);
          } else {
            next.delete(section.id);
          }
          return next;
        });
      };
    });
    return callbacks;
  }, []);
  const handleBrowserPress = useCallback(() => {
    navigation.navigate(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
      params: {
        newTabUrl: portfolioUrl.href,
        timestamp: Date.now(),
        fromTrending: true,
      },
    });
  }, [navigation, portfolioUrl.href]);

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
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  return (
    <Box style={{ paddingTop: insets.top }} twClassName="flex-1 bg-default">
      <Box twClassName="px-4 py-3">
        <Text variant={TextVariant.HeadingLg} twClassName="text-default">
          {strings('trending.title')}
        </Text>
      </Box>

      <Box twClassName="flex-row items-center gap-2 px-4 pb-3">
        <Box twClassName="flex-1">
          <ExploreSearchBar type="button" onPress={handleSearchPress} />
        </Box>

        <TouchableOpacity onPress={handleBrowserPress}>
          {browserTabsCount > 0 ? (
            <Box
              twClassName="rounded-md items-center justify-center h-8 w-8 border-2"
              style={{
                borderColor: colors.text.default,
              }}
            >
              <Text
                variant={TextVariant.BodyMd}
                testID="trending-view-browser-button"
              >
                {browserTabsCount}
              </Text>
            </Box>
          ) : (
            <Icon
              name={IconName.Explore}
              size={IconSize.Xl}
              testID="trending-view-browser-button"
            />
          )}
        </TouchableOpacity>
      </Box>

      {isBasicFunctionalityEnabled ? (
        <ScrollView
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

          {HOME_SECTIONS_ARRAY.map((section) => {
            // Hide section visually but keep mounted so it can report when data arrives
            const isHidden = emptySections.has(section.id);

            return (
              <Box
                key={section.id}
                twClassName={isHidden ? 'hidden' : undefined}
              >
                <SectionHeader sectionId={section.id} />
                <section.Section
                  refreshTrigger={refreshTrigger}
                  toggleSectionEmptyState={sectionCallbacks[section.id]}
                />
              </Box>
            );
          })}
        </ScrollView>
      ) : (
        <BasicFunctionalityEmptyState />
      )}
    </Box>
  );
};
