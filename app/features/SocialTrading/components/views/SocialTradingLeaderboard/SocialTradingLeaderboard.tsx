import React, { useMemo, useState } from 'react';
import { FlatList, Pressable } from 'react-native';
import {
  AvatarAccount,
  AvatarAccountSize,
  Box,
  BoxAlignItems,
  BoxBackgroundColor,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FilterButton,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  SegmentedControl,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../../locales/i18n';
import { useAnalytics } from '../../../../../components/hooks/useAnalytics/useAnalytics';
import { SOCIAL_TRADING_EVENTS } from '../../../analytics/events';
import { useSocialTrading } from '../../../context/SocialTradingContext';
import {
  formatCount,
  formatPct,
  MOCK_TRADERS,
} from '../../../data/mockData';

/**
 * Fictional multipliers used to fake different time ranges from the single
 * mocked 30d PnL figure. Prototype-only.
 */
const RANGE_MULTIPLIER: Record<string, number> = {
  '7d': 0.35,
  '30d': 1,
  '90d': 2.4,
};

interface SocialTradingLeaderboardProps {
  onPressTrader: (traderId: string) => void;
}

/**
 * Ranked list of mock traders with a follow toggle.
 */
export function SocialTradingLeaderboard({
  onPressTrader,
}: SocialTradingLeaderboardProps) {
  const { isFollowing, toggleFollow } = useSocialTrading();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const [range, setRange] = useState<string>('30d');

  const ranked = useMemo(() => {
    const mult = RANGE_MULTIPLIER[range] ?? 1;
    return [...MOCK_TRADERS]
      .map((t) => ({ ...t, rangePnl: t.pnl30d * mult }))
      .sort((a, b) => b.rangePnl - a.rangePnl);
  }, [range]);

  const handleFollow = (traderId: string, following: boolean) => {
    toggleFollow(traderId);
    trackEvent(
      createEventBuilder(SOCIAL_TRADING_EVENTS.TRADER_FOLLOW_TOGGLED)
        .addProperties({
          trader_id: traderId,
          following: !following,
          source: 'leaderboard',
        })
        .build(),
    );
  };

  return (
    <FlatList
      data={ranked}
      keyExtractor={(item) => item.id}
      testID="social-trading-leaderboard-list"
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingBottom: 24,
        paddingTop: 12,
        gap: 8,
      }}
      ListHeaderComponent={
        <Box gap={4} marginBottom={2}>
          <SegmentedControl value={range} onChange={setRange}>
            <FilterButton value="7d">
              {strings('social_trading.leaderboard.range_7d')}
            </FilterButton>
            <FilterButton value="30d">
              {strings('social_trading.leaderboard.range_30d')}
            </FilterButton>
            <FilterButton value="90d">
              {strings('social_trading.leaderboard.range_90d')}
            </FilterButton>
          </SegmentedControl>
        </Box>
      }
      renderItem={({ item, index }) => {
        const following = isFollowing(item.id);
        return (
          <Pressable
            onPress={() => onPressTrader(item.id)}
            accessibilityRole="button"
            accessibilityLabel={item.name}
            testID={`social-trading-leader-${item.id}`}
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Between}
              backgroundColor={BoxBackgroundColor.BackgroundSection}
              twClassName="rounded-2xl"
              padding={3}
            >
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                gap={3}
                twClassName="flex-1"
              >
                <Text
                  variant={TextVariant.BodySm}
                  fontWeight={FontWeight.Bold}
                  color={
                    index < 3 ? TextColor.PrimaryDefault : TextColor.TextMuted
                  }
                  twClassName="w-5 text-center"
                >
                  {index + 1}
                </Text>
                <AvatarAccount
                  address={item.address}
                  size={AvatarAccountSize.Md}
                />
                <Box twClassName="flex-1">
                  <Box
                    flexDirection={BoxFlexDirection.Row}
                    alignItems={BoxAlignItems.Center}
                    gap={1}
                  >
                    <Text
                      variant={TextVariant.BodyMd}
                      fontWeight={FontWeight.Medium}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    {item.verified ? (
                      <Icon
                        name={IconName.VerifiedFilled}
                        size={IconSize.Sm}
                        color={IconColor.PrimaryDefault}
                      />
                    ) : null}
                  </Box>
                  <Text
                    variant={TextVariant.BodyXs}
                    color={TextColor.TextAlternative}
                  >
                    {strings('social_trading.leaderboard.stats', {
                      winRate: item.winRate,
                      copiers: formatCount(item.copiers),
                    })}
                  </Text>
                </Box>
              </Box>
              <Box alignItems={BoxAlignItems.End} gap={1}>
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  color={
                    item.rangePnl >= 0
                      ? TextColor.SuccessDefault
                      : TextColor.ErrorDefault
                  }
                >
                  {formatPct(item.rangePnl)}
                </Text>
                <Button
                  variant={
                    following ? ButtonVariant.Tertiary : ButtonVariant.Secondary
                  }
                  size={ButtonSize.Sm}
                  onPress={() => handleFollow(item.id, following)}
                  testID={`social-trading-follow-${item.id}`}
                >
                  {following
                    ? strings('social_trading.leaderboard.following')
                    : strings('social_trading.leaderboard.follow')}
                </Button>
              </Box>
            </Box>
          </Pressable>
        );
      }}
    />
  );
}

export default SocialTradingLeaderboard;
