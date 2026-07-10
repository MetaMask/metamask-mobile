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
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SectionList,
  type SectionListData,
  type SectionListRenderItemInfo,
} from 'react-native';
import Routes from '../../../../constants/navigation/Routes';
import { ImpactMoment, playImpact } from '../../../../util/haptics';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import {
  QuickBuy,
  TOP_TRADERS_QUICK_BUY_FEATURES,
  type QuickBuyTarget,
} from '../TraderPositionView/components/QuickBuy';
import FeedAudienceToggle from './components/FeedAudienceToggle';
import FeedItemRow from './components/FeedItemRow';
import FeedItemRowSkeleton from './components/FeedItemRowSkeleton';
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
 * -> following); the type selector is visual-only for now. The Trade button is
 * wired: spot rows open the QuickBuy sheet, perps rows navigate to the Perps
 * market detail page.
 */
const FeedView: React.FC<FeedViewProps> = ({ isActive = true }) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const navigation = useNavigation();

  const [audience, setAudience] = useState<FeedAudience>('all');
  const [typeFilter, setTypeFilter] = useState<FeedTypeFilter>('all');
  const [isTypeSheetOpen, setIsTypeSheetOpen] = useState(false);

  const [quickBuyTarget, setQuickBuyTarget] = useState<QuickBuyTarget | null>(
    null,
  );
  const [isQuickBuyVisible, setIsQuickBuyVisible] = useState(false);

  const {
    sections,
    items,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    loadMore,
    error,
    refresh,
  } = useTraderFeed({ audience, enabled: isActive });

  const handleQuickBuyClose = useCallback(() => {
    setIsQuickBuyVisible(false);
  }, []);

  const handleTradePress = useCallback(
    (item: FeedItem) => {
      playImpact(ImpactMoment.PrimaryCTA).catch(() => undefined);

      if (item.type === 'spot') {
        setQuickBuyTarget({
          tokenAddress: item.tokenAddress,
          tokenSymbol: item.tokenSymbol,
          tokenName: item.tokenName,
          chain: item.chain,
        });
        setIsQuickBuyVisible(true);
        return;
      }

      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: {
          market: {
            symbol: item.tradeSymbol,
            name: item.marketName,
          } as PerpsMarketData,
          source: 'social_feed',
        },
      });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: SectionListRenderItemInfo<FeedItem, FeedSection>) => (
      <FeedItemRow item={item} onTradePress={handleTradePress} />
    ),
    [handleTradePress],
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
    () => <Box twClassName="h-px bg-muted" />,
    [],
  );

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) {
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
  }, [isFetchingNextPage, colors.icon.default]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage) {
      loadMore();
    }
  }, [hasNextPage, loadMore]);

  const content = useMemo(() => {
    if (isLoading && items.length === 0) {
      return (
        <Box twClassName="flex-1" testID={FeedViewSelectorsIDs.LOADING}>
          {SKELETON_KEYS.map((key) => (
            <FeedItemRowSkeleton key={key} />
          ))}
        </Box>
      );
    }

    if (error && items.length === 0) {
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

    if (items.length === 0) {
      return <FollowingEmptyState audience={audience} />;
    }

    return (
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ItemSeparatorComponent={renderItemSeparator}
        ListFooterComponent={renderFooter}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        contentContainerStyle={tw.style('pb-6')}
        testID={FeedViewSelectorsIDs.LIST}
      />
    );
  }, [
    isLoading,
    items.length,
    error,
    refresh,
    audience,
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
        <FeedAudienceToggle value={audience} onChange={setAudience} />
      </Box>

      {content}

      <FeedTypeSheet
        isOpen={isTypeSheetOpen}
        value={typeFilter}
        onChange={setTypeFilter}
        onClose={() => setIsTypeSheetOpen(false)}
      />

      <QuickBuy.Root
        isVisible={isQuickBuyVisible}
        target={quickBuyTarget}
        onClose={handleQuickBuyClose}
        features={TOP_TRADERS_QUICK_BUY_FEATURES}
        analyticsContext={{ source: 'leaderboard' }}
      />
    </Box>
  );
};

export default FeedView;
