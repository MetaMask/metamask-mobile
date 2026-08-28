import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
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
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import { useAnalytics } from '../../../../../components/hooks/useAnalytics/useAnalytics';
import { SOCIAL_TRADING_EVENTS } from '../../../analytics/events';
import CopyTradeSheet from '../../CopyTradeSheet/CopyTradeSheet';
import TradeCard from '../../TradeCard/TradeCard';
import { useSocialTrading } from '../../../context/SocialTradingContext';
import {
  formatCount,
  formatPct,
  formatUsd,
  getTrader,
  Trade,
  tradesByTrader,
} from '../../../data/mockData';

export interface SocialTraderProfileParams {
  traderId: string;
}

type SocialTraderProfileRouteProp = RouteProp<
  { SocialTradingTraderProfile: SocialTraderProfileParams },
  'SocialTradingTraderProfile'
>;

/**
 * Profile screen for a mock trader: stats, simulated performance bars, and
 * recent simulated trades.
 */
export function SocialTraderProfile() {
  const navigation = useNavigation();
  const route = useRoute<SocialTraderProfileRouteProp>();
  const { colors } = useTheme();
  const { isFollowing, toggleFollow } = useSocialTrading();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const [copyTarget, setCopyTarget] = useState<Trade | null>(null);

  const trader = getTrader(route.params?.traderId ?? '');

  if (!trader) {
    return (
      <Box
        twClassName="flex-1"
        backgroundColor={BoxBackgroundColor.BackgroundDefault}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        gap={3}
      >
        <Text variant={TextVariant.BodyMd}>
          {strings('social_trading.profile.not_found')}
        </Text>
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Sm}
          onPress={() => navigation.goBack()}
        >
          {strings('social_trading.profile.go_back')}
        </Button>
      </Box>
    );
  }

  const following = isFollowing(trader.id);
  const trades = tradesByTrader(trader.id).sort(
    (a, b) => a.minutesAgo - b.minutesAgo,
  );

  const handleFollow = () => {
    toggleFollow(trader.id);
    trackEvent(
      createEventBuilder(SOCIAL_TRADING_EVENTS.TRADER_FOLLOW_TOGGLED)
        .addProperties({
          trader_id: trader.id,
          following: !following,
          source: 'profile',
        })
        .build(),
    );
  };

  const stats = [
    {
      label: strings('social_trading.profile.stat_pnl_30d'),
      value: formatPct(trader.pnl30d),
      positive: trader.pnl30d >= 0,
    },
    {
      label: strings('social_trading.profile.stat_win_rate'),
      value: `${trader.winRate}%`,
    },
    {
      label: strings('social_trading.profile.stat_copiers'),
      value: formatCount(trader.copiers),
    },
    {
      label: strings('social_trading.profile.stat_aum'),
      value: formatUsd(trader.aumUsd),
    },
  ];

  return (
    <Box
      twClassName="flex-1"
      backgroundColor={BoxBackgroundColor.BackgroundDefault}
    >
      <ScrollView
        testID="social-trading-profile-scroll"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 24,
          paddingTop: 12,
          gap: 16,
        }}
      >
        {/* Identity */}
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={3}
          >
            <AvatarAccount
              address={trader.address}
              size={AvatarAccountSize.Xl}
            />
            <Box>
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                gap={1}
              >
                <Text variant={TextVariant.HeadingMd}>{trader.name}</Text>
                {trader.verified ? (
                  <Icon
                    name={IconName.VerifiedFilled}
                    size={IconSize.Md}
                    color={IconColor.PrimaryDefault}
                  />
                ) : null}
              </Box>
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {trader.handle} ·{' '}
                {strings('social_trading.profile.followers', {
                  count: formatCount(trader.followers),
                })}
              </Text>
            </Box>
          </Box>
          <Button
            variant={following ? ButtonVariant.Tertiary : ButtonVariant.Primary}
            size={ButtonSize.Sm}
            onPress={handleFollow}
            testID="social-trading-trader-follow"
          >
            {following
              ? strings('social_trading.leaderboard.following')
              : strings('social_trading.leaderboard.follow')}
          </Button>
        </Box>

        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {trader.bio}
        </Text>

        {/* Stats */}
        <Box flexDirection={BoxFlexDirection.Row} gap={2}>
          {stats.map((stat) => (
            <Box
              key={stat.label}
              backgroundColor={BoxBackgroundColor.BackgroundSection}
              twClassName="rounded-xl flex-1"
              alignItems={BoxAlignItems.Center}
              paddingVertical={3}
              gap={1}
            >
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={
                  stat.positive === undefined
                    ? TextColor.TextDefault
                    : stat.positive
                      ? TextColor.SuccessDefault
                      : TextColor.ErrorDefault
                }
              >
                {stat.value}
              </Text>
              <Text variant={TextVariant.BodyXs} color={TextColor.TextMuted}>
                {stat.label}
              </Text>
            </Box>
          ))}
        </Box>

        {/* Performance bars */}
        <Box
          backgroundColor={BoxBackgroundColor.BackgroundSection}
          twClassName="rounded-2xl"
          padding={4}
          gap={3}
        >
          <Text variant={TextVariant.HeadingSm}>
            {strings('social_trading.profile.performance_title')}
          </Text>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.End}
            gap={2}
            twClassName="h-24"
          >
            {trader.perf.map((v, i) => (
              <View
                // eslint-disable-next-line react/no-array-index-key
                key={i}
                style={{
                  flex: 1,
                  height: `${Math.max(8, v * 100)}%`,
                  borderRadius: 4,
                  backgroundColor:
                    i === trader.perf.length - 1
                      ? colors.success.default
                      : colors.success.muted,
                }}
              />
            ))}
          </Box>
          <Text variant={TextVariant.BodyXs} color={TextColor.TextMuted}>
            {strings('social_trading.profile.performance_caption')}
          </Text>
        </Box>

        {/* Recent trades */}
        <Box gap={3}>
          <Text variant={TextVariant.HeadingSm}>
            {strings('social_trading.profile.recent_trades')}
          </Text>
          {trades.length === 0 ? (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {strings('social_trading.profile.no_trades')}
            </Text>
          ) : (
            trades.map((trade) => (
              <TradeCard key={trade.id} trade={trade} onCopy={setCopyTarget} />
            ))
          )}
        </Box>
      </ScrollView>
      {copyTarget ? (
        <CopyTradeSheet
          trade={copyTarget}
          onClose={() => setCopyTarget(null)}
        />
      ) : null}
    </Box>
  );
}

export default SocialTraderProfile;
