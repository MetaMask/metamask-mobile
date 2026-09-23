import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';
import { strings } from '../../../../../../locales/i18n';
import WinRateTag from '../../components/WinRateTag';
import { useRankChangeAnimation } from './useRankChangeAnimation';
/* eslint-disable import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog */
import TraderAvatar from '../../../Homepage/Sections/TopTraders/components/TraderAvatar';
import {
  RankMedal,
  isTopRank,
} from '../../../Homepage/Sections/TopTraders/topRank';
import type { TraderRowProps } from '../../../Homepage/Sections/TopTraders/types';
/* eslint-enable import-x/no-restricted-paths */
import {
  formatCount,
  formatPercent,
  formatSignedUsd,
} from '../../utils/formatters';

const AVATAR_SIZE = 40;
// Medal height that keeps the badge tucked into the avatar's bottom-right
// corner rather than dominating it (the default 30 is sized for a standalone
// podium).
const MEDAL_HEIGHT = 24;
/**
 * Fixed row height so the skeleton placeholder can match it exactly without
 * drifting due to font-scale differences.
 */
export const SOCIAL_V1_TRADER_ROW_HEIGHT = 72;

/**
 * SocialV1TraderRow -- a single row in the Social Bundle V1 leaderboard.
 *
 * Metrics-first counterpart to the legacy `TraderRow`: instead of leading with
 * a Follow action and one PnL figure, it pairs the trader's identity (avatar
 * with podium medal, username, win-rate tag, follower count) with a
 * right-aligned column showing the ranked metric over ROI.
 *
 * Accepts the shared `TraderRowProps` so it can be injected into
 * `TopTradersView` interchangeably with the legacy row, but deliberately
 * ignores the follow and mute callbacks -- this surface has no inline actions.
 */
const SocialV1TraderRow: React.FC<TraderRowProps> = ({
  trader,
  metric,
  onTraderPress,
  testID,
}) => {
  const metricText = metric?.label ?? formatSignedUsd(trader.pnlValue);
  const isMetricPositive = metric?.isPositive ?? trader.pnlValue >= 0;
  const showMedal = isTopRank(trader.rank);
  const rankChangeStyle = useRankChangeAnimation(trader.rank);

  const followerLabel = strings(
    trader.followerCount === 1
      ? 'social_leaderboard.trader_profile.followers_count'
      : 'social_leaderboard.trader_profile.followers_count_plural',
    { count: formatCount(trader.followerCount) },
  );
  const roi = formatPercent(trader.percentageChange, { decimals: 1 });

  return (
    <Animated.View style={rankChangeStyle}>
      <TouchableOpacity
        activeOpacity={onTraderPress ? 0.7 : 1}
        onPress={
          onTraderPress
            ? () =>
                onTraderPress(trader.id, trader.username, trader.overallRank)
            : undefined
        }
        disabled={!onTraderPress}
        testID={testID ?? `trader-row-${trader.id}`}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={3}
          twClassName="px-4"
          style={{ height: SOCIAL_V1_TRADER_ROW_HEIGHT }}
        >
          <Box>
            <TraderAvatar
              imageUrl={trader.avatarUri}
              address={trader.address}
              size={AVATAR_SIZE}
              recyclingKey={trader.id}
            />
            {showMedal ? (
              <Box twClassName="absolute -bottom-1 -right-2">
                <RankMedal rank={trader.rank} size={MEDAL_HEIGHT} />
              </Box>
            ) : null}
          </Box>

          {/* `min-w-0` lets the name truncate inside the row instead of
            pushing the metrics column off the right edge. */}
          <Box twClassName="flex-1 min-w-0">
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={2}
            >
              <Text
                variant={TextVariant.BodyLg}
                fontWeight={FontWeight.Bold}
                color={TextColor.TextDefault}
                numberOfLines={1}
                twClassName="shrink"
              >
                {trader.username}
              </Text>
              <WinRateTag winRatePercent={trader.winRatePercent} />
            </Box>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              numberOfLines={1}
            >
              {followerLabel}
            </Text>
          </Box>

          <Box alignItems={BoxAlignItems.End} twClassName="shrink-0">
            <Text
              variant={TextVariant.BodyLg}
              fontWeight={FontWeight.Medium}
              numberOfLines={1}
              twClassName={
                isMetricPositive ? 'text-success-default' : 'text-error-default'
              }
            >
              {metricText}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              numberOfLines={1}
            >
              {roi}
            </Text>
          </Box>
        </Box>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default React.memo(SocialV1TraderRow);
