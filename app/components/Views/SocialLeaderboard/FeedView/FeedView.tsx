import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useNavigation } from '@react-navigation/native';
import type { PerpsMarketData } from '@metamask/perps-controller';
import React, { useCallback, useState } from 'react';
import {
  SectionList,
  type SectionListData,
  type SectionListRenderItemInfo,
} from 'react-native';
import Routes from '../../../../constants/navigation/Routes';
import { ImpactMoment, playImpact } from '../../../../util/haptics';
import {
  QuickBuy,
  TOP_TRADERS_QUICK_BUY_FEATURES,
  type QuickBuyTarget,
} from '../TraderPositionView/components/QuickBuy';
import FeedAudienceToggle from './components/FeedAudienceToggle';
import FeedItemRow from './components/FeedItemRow';
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

/**
 * Trader activity Feed tab.
 *
 * UI-only for now: the type selector and audience toggle change their own
 * selected state (with haptics) but don't fetch/filter real data — the
 * `following` audience surfaces the empty state, `all` shows the mock list.
 * The Trade button is wired: spot rows open the QuickBuy sheet, perps rows
 * navigate to the Perps market detail page.
 */
const FeedView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();

  const [audience, setAudience] = useState<FeedAudience>('all');
  const [typeFilter, setTypeFilter] = useState<FeedTypeFilter>('all');
  const [isTypeSheetOpen, setIsTypeSheetOpen] = useState(false);

  const [quickBuyTarget, setQuickBuyTarget] = useState<QuickBuyTarget | null>(
    null,
  );
  const [isQuickBuyVisible, setIsQuickBuyVisible] = useState(false);

  const { sections } = useTraderFeed({ audience });

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
            symbol: item.marketSymbol,
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

      {audience === 'following' ? (
        <FollowingEmptyState />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          ItemSeparatorComponent={renderItemSeparator}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw.style('pb-6')}
          testID={FeedViewSelectorsIDs.LIST}
        />
      )}

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
