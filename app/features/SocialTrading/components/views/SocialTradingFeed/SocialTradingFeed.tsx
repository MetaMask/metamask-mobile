import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView } from 'react-native';
import {
  AvatarAccount,
  AvatarAccountSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonFilter,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../../locales/i18n';
import CopyTradeSheet from '../../CopyTradeSheet/CopyTradeSheet';
import TradeCard from '../../TradeCard/TradeCard';
import { useSocialTrading } from '../../../context/SocialTradingContext';
import {
  formatPct,
  MOCK_TRADERS,
  MOCK_TRADES,
  Trade,
} from '../../../data/mockData';

type FeedFilter = 'all' | 'following';

interface SocialTradingFeedProps {
  onPressTrader: (traderId: string) => void;
}

/**
 * Feed of simulated trades with a top-traders strip and filter chips.
 */
export function SocialTradingFeed({ onPressTrader }: SocialTradingFeedProps) {
  const { followedIds } = useSocialTrading();
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [copyTarget, setCopyTarget] = useState<Trade | null>(null);

  const trades = useMemo(() => {
    const sorted = [...MOCK_TRADES].sort((a, b) => a.minutesAgo - b.minutesAgo);
    if (filter === 'following') {
      return sorted.filter((t) => followedIds.includes(t.traderId));
    }
    return sorted;
  }, [filter, followedIds]);

  return (
    <>
      <FlatList
        data={trades}
        keyExtractor={(item) => item.id}
        testID="social-trading-feed-list"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 24,
          paddingTop: 12,
          gap: 12,
        }}
        ListHeaderComponent={
          <Box gap={4} marginBottom={2}>
            {/* Top traders strip */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 16 }}
            >
              {MOCK_TRADERS.map((trader) => (
                <Pressable
                  key={trader.id}
                  onPress={() => onPressTrader(trader.id)}
                  accessibilityRole="button"
                  accessibilityLabel={trader.name}
                  testID={`social-trading-story-${trader.id}`}
                >
                  <Box
                    alignItems={BoxAlignItems.Center}
                    gap={1}
                    twClassName="w-16"
                  >
                    <AvatarAccount
                      address={trader.address}
                      size={AvatarAccountSize.Lg}
                    />
                    <Text
                      variant={TextVariant.BodyXs}
                      numberOfLines={1}
                      color={TextColor.TextAlternative}
                    >
                      {trader.name.split(' ')[0]}
                    </Text>
                    <Text
                      variant={TextVariant.BodyXs}
                      fontWeight={FontWeight.Medium}
                      color={
                        trader.pnl30d >= 0
                          ? TextColor.SuccessDefault
                          : TextColor.ErrorDefault
                      }
                    >
                      {formatPct(trader.pnl30d)}
                    </Text>
                  </Box>
                </Pressable>
              ))}
            </ScrollView>
            {/* Filter chips */}
            <Box flexDirection={BoxFlexDirection.Row} gap={2}>
              <ButtonFilter
                isActive={filter === 'all'}
                onPress={() => setFilter('all')}
                testID="social-trading-filter-all"
              >
                {strings('social_trading.feed.all_trades')}
              </ButtonFilter>
              <ButtonFilter
                isActive={filter === 'following'}
                onPress={() => setFilter('following')}
                testID="social-trading-filter-following"
              >
                {strings('social_trading.feed.following')}
              </ButtonFilter>
            </Box>
          </Box>
        }
        ListEmptyComponent={
          <Box alignItems={BoxAlignItems.Center} paddingVertical={12} gap={2}>
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {strings('social_trading.feed.empty_title')}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              twClassName="text-center"
            >
              {strings('social_trading.feed.empty_description')}
            </Text>
          </Box>
        }
        renderItem={({ item }) => (
          <TradeCard
            trade={item}
            onCopy={setCopyTarget}
            onPressTrader={onPressTrader}
          />
        )}
      />
      {copyTarget ? (
        <CopyTradeSheet
          trade={copyTarget}
          onClose={() => setCopyTarget(null)}
        />
      ) : null}
    </>
  );
}

export default SocialTradingFeed;
