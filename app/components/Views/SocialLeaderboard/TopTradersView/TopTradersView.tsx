import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  FlatList,
  Pressable,
  RefreshControl,
  Text as RNText,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { RootStackParamList } from '../../../../core/NavigationService/types';
import { useSelector } from 'react-redux';
import {
  SocialLeaderboardEventProperties,
  useSocialLeaderboardAnalytics,
} from '../analytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { selectSocialLeaderboardEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';
import { fontStyles } from '../../../../styles/common';
import Logger from '../../../../util/Logger';
import { buildSocialLoggerErrorOptions } from '../../../../util/social/socialServiceTelemetry';
import { useTheme } from '../../../../util/theme';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { useNotificationStoragePreferences } from '../../Settings/NotificationsSettings/hooks/useNotificationStoragePreferences';
import {
  TraderRow,
  TraderRowSkeleton,
  // eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
} from '../../Homepage/Sections/TopTraders/components';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { TRADER_ROW_HEIGHT } from '../../Homepage/Sections/TopTraders/components/TraderRow';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { useTopTraders } from '../../Homepage/Sections/TopTraders/hooks';
import {
  ALL_CHAINS,
  PERP_CHAINS,
  SPOT_CHAINS,
} from '../../shared/top-traders-constants';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { TopTrader } from '../../Homepage/Sections/TopTraders/types';
import { TopTradersViewSelectorsIDs } from './TopTradersView.testIds';

type TabFilter = 'all' | 'tokens' | 'perps';

const LEADERBOARD_LIMIT = 50;

const getTabFilters = (): { key: TabFilter; label: string }[] => [
  {
    key: 'all',
    label: strings('social_leaderboard.top_traders_view.chain_filter.all'),
  },
  {
    key: 'tokens',
    label: strings('social_leaderboard.top_traders_view.chain_filter.tokens'),
  },
  {
    key: 'perps',
    label: strings('social_leaderboard.top_traders_view.chain_filter.perps'),
  },
];

const styles = StyleSheet.create({
  filterScrollView: {
    flexGrow: 0,
    flexShrink: 0,
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pill: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  pillText: {
    ...fontStyles.medium,
    fontSize: 16,
  },
});

interface TabPillProps {
  filterKey: TabFilter;
  label: string;
  isSelected: boolean;
  onPress: () => void;
}

const TabPill: React.FC<TabPillProps> = ({
  filterKey,
  label,
  isSelected,
  onPress,
}) => {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      testID={`tab-filter-${filterKey}`}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      style={[
        styles.pill,
        isSelected
          ? { backgroundColor: colors.icon.default }
          : { backgroundColor: colors.background.muted },
      ]}
    >
      <RNText
        style={[
          styles.pillText,
          { color: isSelected ? colors.primary.inverse : colors.text.default },
        ]}
      >
        {label}
      </RNText>
    </Pressable>
  );
};

const TopTradersView = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'TopTradersView'>>();
  const tw = useTailwind();
  const { colors } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const isEnabled = useSelector(selectSocialLeaderboardEnabled);
  const {
    hasNotificationPreferences,
    isLoading: isLoadingNotificationPreferences,
  } = useNotificationStoragePreferences();
  const { track } = useSocialLeaderboardAnalytics();
  const source = route.params?.source ?? 'nav_tab';

  const [selectedTab, setSelectedTab] = useState<TabFilter>('all');
  const [refreshing, setRefreshing] = useState(false);
  // Tracks whether we've already emitted the screen-viewed event this mount.
  // Avoids re-firing if the user changes filters or refreshes.
  const hasFiredScreenViewedRef = useRef(false);

  // Render enough skeleton rows to cover the visible list area. Add a couple of
  // extras so users can see the shimmer continue past the fold while scrolling.
  const skeletonKeys = useMemo(() => {
    const count = Math.ceil(windowHeight / TRADER_ROW_HEIGHT) + 2;
    return Array.from({ length: count }, (_, i) => `top-trader-skeleton-${i}`);
  }, [windowHeight]);

  const allResult = useTopTraders({
    limit: LEADERBOARD_LIMIT,
    chains: ALL_CHAINS,
    enabled: isEnabled,
  });
  const tokensResult = useTopTraders({
    limit: LEADERBOARD_LIMIT,
    chains: SPOT_CHAINS,
    enabled: isEnabled,
  });
  const perpsResult = useTopTraders({
    limit: LEADERBOARD_LIMIT,
    chains: PERP_CHAINS,
    enabled: isEnabled,
  });

  const resultsByTab = useMemo(
    () => ({
      all: allResult,
      tokens: tokensResult,
      perps: perpsResult,
    }),
    [allResult, tokensResult, perpsResult],
  );

  const activeResult = resultsByTab[selectedTab];
  const { traders, isLoading, toggleFollow } = activeResult;

  useEffect(() => {
    if (!isEnabled) {
      navigation.goBack();
    }
  }, [isEnabled, navigation]);

  useEffect(() => {
    if (!isEnabled || hasFiredScreenViewedRef.current) return;
    hasFiredScreenViewedRef.current = true;
    track(MetaMetricsEvents.SOCIAL_TRADER_LEADERBOARD_SCREEN_VIEWED, {
      [SocialLeaderboardEventProperties.SOURCE]: source,
      [SocialLeaderboardEventProperties.CHAIN_FILTER]: selectedTab,
    });
    // selectedTab is intentionally captured at mount-time so subsequent
    // pill changes only fire the chain-filter-changed event.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnabled, source, track]);

  const handleTabPress = useCallback(
    (next: TabFilter) => {
      if (selectedTab === next) return;
      track(MetaMetricsEvents.SOCIAL_TRADER_LEADERBOARD_CHAIN_FILTER_CHANGED, {
        [SocialLeaderboardEventProperties.CHAIN_FILTER]: next,
        [SocialLeaderboardEventProperties.PREVIOUS_CHAIN_FILTER]: selectedTab,
      });
      setSelectedTab(next);
    },
    [selectedTab, track],
  );

  const handleFollowPress = useCallback(
    (traderId: string) => {
      const trader = traders.find((t) => t.id === traderId);
      toggleFollow(traderId, {
        source: 'leaderboard',
        traderAddress: trader?.address ?? '',
        traderUsername: trader?.username,
        traderRank: trader?.rank,
      });
    },
    [traders, toggleFollow],
  );

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleNotificationPreferencesPress = useCallback(() => {
    if (isLoadingNotificationPreferences) {
      return;
    }

    if (!hasNotificationPreferences) {
      navigation.navigate(Routes.SETTINGS_VIEW, {
        screen: Routes.SETTINGS.NOTIFICATIONS,
      });
      return;
    }

    navigation.navigate(Routes.SETTINGS_VIEW, {
      screen: Routes.SETTINGS.NOTIFICATION_SETTINGS_SECTION,
      params: {
        type: 'socialAI',
        title: strings('app_settings.notifications_opts.social_ai_title'),
        description: strings('app_settings.notifications_opts.social_ai_desc'),
      },
    });
  }, [
    hasNotificationPreferences,
    isLoadingNotificationPreferences,
    navigation,
  ]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const minDuration = new Promise<void>((resolve) =>
        setTimeout(resolve, 1000),
      );
      await Promise.all([
        allResult.refresh(),
        tokensResult.refresh(),
        perpsResult.refresh(),
        minDuration,
      ]);
    } catch (err) {
      Logger.error(
        err as Error,
        buildSocialLoggerErrorOptions({
          surface: 'top_traders',
          operation: 'pull_to_refresh',
          extraMessage: 'Top traders pull-to-refresh failed',
          source: 'TopTradersView',
          error: err,
        }),
      );
    } finally {
      setRefreshing(false);
    }
  }, [allResult, tokensResult, perpsResult]);

  const handleTraderPress = useCallback(
    (traderId: string, traderName: string) => {
      const trader = traders.find((t) => t.id === traderId);
      if (trader) {
        track(MetaMetricsEvents.SOCIAL_TRADER_LEADERBOARD_TRADER_CLICKED, {
          [SocialLeaderboardEventProperties.TRADER_ADDRESS]: trader.address,
          [SocialLeaderboardEventProperties.TRADER_USERNAME]: trader.username,
          [SocialLeaderboardEventProperties.TRADER_RANK]: trader.rank,
          [SocialLeaderboardEventProperties.CHAIN_FILTER]: selectedTab,
        });
      }
      navigation.navigate(Routes.SOCIAL_LEADERBOARD.PROFILE, {
        traderId,
        traderName,
        traderAddress: trader?.address,
        source: 'leaderboard',
        traderRank: trader?.rank,
      });
    },
    [navigation, traders, selectedTab, track],
  );

  const renderTraderRow = useCallback(
    ({ item }: { item: TopTrader }) => (
      <TraderRow
        trader={item}
        onFollowPress={handleFollowPress}
        onTraderPress={handleTraderPress}
      />
    ),
    [handleFollowPress, handleTraderPress],
  );

  return (
    <SafeAreaView
      edges={['top']}
      style={tw.style('flex-1 bg-default')}
      testID={TopTradersViewSelectorsIDs.CONTAINER}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="px-2 py-2"
      >
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Md}
          onPress={handleBack}
          testID={TopTradersViewSelectorsIDs.BACK_BUTTON}
        />
        <ButtonIcon
          iconName={IconName.Notification}
          size={ButtonIconSize.Md}
          onPress={handleNotificationPreferencesPress}
          testID={TopTradersViewSelectorsIDs.NOTIFICATION_BUTTON}
        />
      </Box>

      <Box twClassName="px-4 pt-2 pb-3">
        <Text variant={TextVariant.HeadingLg} color={TextColor.TextDefault}>
          {strings('social_leaderboard.top_traders_view.title')}
        </Text>
      </Box>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        // `flexGrow: 0` + `flexShrink: 0` pin the ScrollView's height to
        // its content so neither the FlatList nor the loading ScrollView
        // below can stretch or compress it.
        style={styles.filterScrollView}
        contentContainerStyle={styles.filterRow}
      >
        {getTabFilters().map(({ key, label }) => (
          <TabPill
            key={key}
            filterKey={key}
            label={label}
            isSelected={selectedTab === key}
            onPress={() => handleTabPress(key)}
          />
        ))}
      </ScrollView>

      {isLoading && traders.length === 0 ? (
        <ScrollView
          // `flex-1` matches FlatList's default behavior so the list area sits
          // directly under the filters and skeletons render top-aligned.
          style={tw.style('flex-1')}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw.style('pb-6')}
          refreshControl={
            <RefreshControl
              colors={[colors.primary.default]}
              tintColor={colors.icon.default}
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
          }
        >
          {skeletonKeys.map((key) => (
            <TraderRowSkeleton key={key} />
          ))}
        </ScrollView>
      ) : (
        <FlatList
          data={traders}
          keyExtractor={(item) => item.id}
          renderItem={renderTraderRow}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw.style('pb-6')}
          testID={TopTradersViewSelectorsIDs.TRADER_LIST}
          initialNumToRender={15}
          windowSize={5}
          refreshControl={
            <RefreshControl
              colors={[colors.primary.default]}
              tintColor={colors.icon.default}
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

export default TopTradersView;
