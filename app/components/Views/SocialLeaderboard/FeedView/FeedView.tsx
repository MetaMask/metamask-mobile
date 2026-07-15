import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useNavigation } from '@react-navigation/native';
import type { PerpsMarketData } from '@metamask/perps-controller';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  SectionList,
  type SectionListData,
  type SectionListRenderItemInfo,
} from 'react-native';
import Routes from '../../../../constants/navigation/Routes';
import {
  ImpactMoment,
  playImpact,
  playSelection,
} from '../../../../util/haptics';
import { strings } from '../../../../../locales/i18n';
import Logger from '../../../../util/Logger';
import { buildSocialLoggerErrorOptions } from '../../../../util/social/socialServiceTelemetry';
import { useTheme } from '../../../../util/theme';
import { toAssetId } from '../../../UI/Bridge/hooks/useAssetMetadata/utils';
import {
  SocialLeaderboardEventProperties,
  SocialLeaderboardEventValues,
  useSocialLeaderboardAnalytics,
} from '../analytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import {
  QuickBuy,
  TOP_TRADERS_QUICK_BUY_FEATURES,
  type QuickBuyTarget,
} from '../TraderPositionView/components/QuickBuy';
import FeedAudienceToggle from './components/FeedAudienceToggle';
import FeedItemRow from './components/FeedItemRow';
import FeedItemRowSkeleton from './components/FeedItemRowSkeleton';
import FeedTypeEmptyState from './components/FeedTypeEmptyState';
import FeedTypeSelector from './components/FeedTypeSelector';
import FeedTypeSheet from './components/FeedTypeSheet';
import FollowingEmptyState from './components/FollowingEmptyState';
import { useTraderFeed } from './hooks/useTraderFeed';
import type {
  FeedAudience,
  FeedItem,
  FeedSection,
  FeedTypeFilter,
} from './types';
import { FeedViewSelectorsIDs } from './FeedView.testIds';

const SKELETON_ROW_COUNT = 6;
const SKELETON_KEYS = Array.from(
  { length: SKELETON_ROW_COUNT },
  (_, i) => `feed-skeleton-${i}`,
);

export interface FeedViewProps {
  /**
   * Whether the Feed tab is the active page. The feed fetch only fires when
   * active so simply opening the Follow Trading surface (which mounts both tab
   * pages) doesn't request the feed until the user actually views it. Defaults
   * to `true` for standalone use.
   */
  isActive?: boolean;
}

/**
 * Trader activity Feed tab.
 *
 * Fetches real data via `useTraderFeed` (`SocialService:fetchFeed`) with cursor
 * pagination. The audience toggle switches scope (All -> leaderboard, Following
 * -> following); the type selector filters spot/perps client-side over loaded
 * pages. The Trade button is wired: spot rows open the QuickBuy sheet, perps
 * rows navigate to the Perps market detail page.
 */
const FeedView: React.FC<FeedViewProps> = ({ isActive = true }) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { track } = useSocialLeaderboardAnalytics();

  // Default to "Following": the backend "leaderboard" scope isn't implemented
  // yet, so the feed opens on the Following scope (the only one the API serves).
  const [audience, setAudience] = useState<FeedAudience>('following');
  const [typeFilter, setTypeFilter] = useState<FeedTypeFilter>('all');
  const audienceRef = useRef(audience);
  const typeFilterRef = useRef(typeFilter);
  audienceRef.current = audience;
  typeFilterRef.current = typeFilter;
  const [isTypeSheetOpen, setIsTypeSheetOpen] = useState(false);

  const [quickBuyTarget, setQuickBuyTarget] = useState<QuickBuyTarget | null>(
    null,
  );
  const [isQuickBuyVisible, setIsQuickBuyVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const {
    sections,
    items,
    hasLoadedItems,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    loadMore,
    error,
    refresh,
  } = useTraderFeed({ audience, typeFilter, enabled: isActive });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Hold the spinner for a beat so a fast refetch doesn't flicker.
      const minDuration = new Promise<void>((resolve) =>
        setTimeout(resolve, 1000),
      );
      await Promise.all([refresh(), minDuration]);
    } catch (err) {
      Logger.error(
        err as Error,
        buildSocialLoggerErrorOptions({
          surface: 'trader_feed',
          operation: 'pull_to_refresh',
          extraMessage: 'Trader feed pull-to-refresh failed',
          source: 'FeedView',
          error: err,
        }),
      );
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const handleQuickBuyClose = useCallback(() => {
    setIsQuickBuyVisible(false);
  }, []);

  const handleAudienceChange = useCallback(
    (next: FeedAudience) => {
      if (audienceRef.current === next) {
        return;
      }

      track(MetaMetricsEvents.SOCIAL_TRADER_FEED_AUDIENCE_FILTER_CHANGED, {
        [SocialLeaderboardEventProperties.FEED_AUDIENCE]: next,
      });
      audienceRef.current = next;
      setAudience(next);
    },
    [track],
  );

  const handleTypeFilterChange = useCallback(
    (next: FeedTypeFilter) => {
      const previous = typeFilterRef.current;
      if (previous === next) {
        return;
      }

      track(MetaMetricsEvents.SOCIAL_TRADER_FEED_TYPE_FILTER_CHANGED, {
        [SocialLeaderboardEventProperties.FEED_TYPE_FILTER]: next,
        [SocialLeaderboardEventProperties.PREVIOUS_FEED_TYPE_FILTER]: previous,
      });
      typeFilterRef.current = next;
      setTypeFilter(next);
    },
    [track],
  );

  const handleTradePress = useCallback(
    (item: FeedItem) => {
      playImpact(ImpactMoment.PrimaryCTA).catch(() => undefined);

      const sharedTradeProps = {
        [SocialLeaderboardEventProperties.SOURCE]: 'trader_feed',
        [SocialLeaderboardEventProperties.TRADER_ADDRESS]: item.traderAddress,
        [SocialLeaderboardEventProperties.TRADER_USERNAME]: item.username,
        [SocialLeaderboardEventProperties.FEED_ACTION]: item.action,
        [SocialLeaderboardEventProperties.FEED_AUDIENCE]: audience,
        [SocialLeaderboardEventProperties.FEED_TYPE_FILTER]: typeFilter,
      };

      if (item.type === 'spot') {
        const caip19 = toAssetId(item.tokenAddress, item.chain);

        track(MetaMetricsEvents.SOCIAL_TRADER_FEED_ITEM_TRADE_CLICKED, {
          ...sharedTradeProps,
          [SocialLeaderboardEventProperties.TRADE_TYPE]:
            SocialLeaderboardEventValues.TRADE_TYPE.SPOT,
          [SocialLeaderboardEventProperties.ASSET_NAME]: item.tokenSymbol,
          ...(caip19
            ? { [SocialLeaderboardEventProperties.CAIP19]: caip19 }
            : {}),
        });

        setQuickBuyTarget({
          tokenAddress: item.tokenAddress,
          tokenSymbol: item.tokenSymbol,
          tokenName: item.tokenName,
          chain: item.chain,
        });
        setIsQuickBuyVisible(true);
        return;
      }

      track(MetaMetricsEvents.SOCIAL_TRADER_FEED_ITEM_TRADE_CLICKED, {
        ...sharedTradeProps,
        [SocialLeaderboardEventProperties.TRADE_TYPE]:
          SocialLeaderboardEventValues.TRADE_TYPE.PERPS,
        [SocialLeaderboardEventProperties.ASSET_NAME]: item.marketSymbol,
        [SocialLeaderboardEventProperties.PERPS_MARKET]: item.tradeSymbol,
      });

      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: {
          market: {
            symbol: item.tradeSymbol,
            name: item.marketName,
          } as PerpsMarketData,
          source: 'trader_feed',
        },
      });
    },
    [audience, navigation, track, typeFilter],
  );

  const handleTraderPress = useCallback(
    (item: FeedItem) => {
      playSelection().catch(() => undefined);
      navigation.navigate(Routes.SOCIAL_LEADERBOARD.PROFILE, {
        traderId: item.traderId,
        traderName: item.username,
        traderAddress: item.traderAddress,
        source: 'trader_feed',
      });
    },
    [navigation],
  );

  const handlePositionPress = useCallback(
    (item: FeedItem) => {
      playSelection().catch(() => undefined);
      navigation.navigate(Routes.SOCIAL_LEADERBOARD.POSITION, {
        positionId: item.tokenAvatar.positionId,
        traderId: item.traderId,
        traderAddress: item.traderAddress,
        source: 'trader_feed',
      });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: SectionListRenderItemInfo<FeedItem, FeedSection>) => (
      <FeedItemRow
        item={item}
        onTradePress={handleTradePress}
        onPositionPress={handlePositionPress}
        onTraderPress={handleTraderPress}
      />
    ),
    [handleTradePress, handlePositionPress, handleTraderPress],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionListData<FeedItem, FeedSection> }) => (
      <Box twClassName="px-4 pt-4 pb-1 bg-default">
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {section.dateLabel}
        </Text>
      </Box>
    ),
    [],
  );

  const renderItemSeparator = useCallback(
    () => <Box twClassName="h-px bg-muted my-1" />,
    [],
  );

  const renderFooter = useCallback(() => {
    // When the list is empty, `ListEmptyComponent` owns the loading affordance
    // (e.g. the type-filter empty state's spinner) — skip the footer duplicate.
    if (!isFetchingNextPage || items.length === 0) {
      return null;
    }
    return (
      <Box
        alignItems={BoxAlignItems.Center}
        twClassName="py-4"
        testID={FeedViewSelectorsIDs.FOOTER_LOADING}
      >
        <ActivityIndicator size="small" color={colors.icon.default} />
      </Box>
    );
  }, [isFetchingNextPage, items.length, colors.icon.default]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage) {
      loadMore();
    }
  }, [hasNextPage, loadMore]);

  const refreshControl = useMemo(
    () => (
      <RefreshControl
        colors={[colors.primary.default]}
        tintColor={colors.icon.default}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />
    ),
    [colors.primary.default, colors.icon.default, refreshing, handleRefresh],
  );

  const renderListEmpty = useCallback(() => {
    if (error) {
      return (
        <Box
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="flex-1 px-8 py-16 gap-3"
          testID={FeedViewSelectorsIDs.ERROR_STATE}
        >
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="text-center"
          >
            {strings('social_leaderboard.feed.error.title')}
          </Text>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Sm}
            onPress={refresh}
            twClassName="self-center"
            testID={FeedViewSelectorsIDs.RETRY_BUTTON}
          >
            {strings('social_leaderboard.feed.error.retry')}
          </Button>
        </Box>
      );
    }

    if (typeFilter !== 'all' && hasLoadedItems) {
      return (
        <FeedTypeEmptyState
          typeFilter={typeFilter}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={loadMore}
        />
      );
    }

    return <FollowingEmptyState audience={audience} />;
  }, [
    error,
    refresh,
    audience,
    typeFilter,
    hasLoadedItems,
    hasNextPage,
    isFetchingNextPage,
    loadMore,
  ]);

  const content = useMemo(() => {
    if (isLoading && items.length === 0) {
      return (
        <ScrollView
          style={tw.style('flex-1')}
          contentContainerStyle={tw.style('pb-6')}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
          testID={FeedViewSelectorsIDs.LOADING}
        >
          {SKELETON_KEYS.map((key) => (
            <FeedItemRowSkeleton key={key} />
          ))}
        </ScrollView>
      );
    }

    return (
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ItemSeparatorComponent={renderItemSeparator}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderListEmpty}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        contentContainerStyle={tw.style('pb-6 flex-grow')}
        refreshControl={refreshControl}
        testID={FeedViewSelectorsIDs.LIST}
      />
    );
  }, [
    isLoading,
    items.length,
    refreshControl,
    renderListEmpty,
    sections,
    renderItem,
    renderSectionHeader,
    renderItemSeparator,
    renderFooter,
    handleEndReached,
    tw,
  ]);

  return (
    <Box
      twClassName="flex-1 bg-default"
      testID={FeedViewSelectorsIDs.CONTAINER}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="px-4 py-3"
        gap={3}
      >
        <FeedTypeSelector
          value={typeFilter}
          onPress={() => setIsTypeSheetOpen(true)}
        />
        <FeedAudienceToggle value={audience} onChange={handleAudienceChange} />
      </Box>

      {content}

      <FeedTypeSheet
        isOpen={isTypeSheetOpen}
        value={typeFilter}
        onChange={handleTypeFilterChange}
        onClose={() => setIsTypeSheetOpen(false)}
      />

      <QuickBuy.Root
        isVisible={isQuickBuyVisible}
        target={quickBuyTarget}
        onClose={handleQuickBuyClose}
        features={TOP_TRADERS_QUICK_BUY_FEATURES}
        analyticsContext={{ source: 'trader_feed' }}
      />
    </Box>
  );
};

export default FeedView;
