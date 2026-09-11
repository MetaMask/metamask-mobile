import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  IconName,
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { strings } from '../../../../../../../locales/i18n';
import { RankMedal, isTopRank } from '../topRank';
import type { TopTrader } from '../types';
/* eslint-disable import-x/no-restricted-paths -- TODO(ADR-0020): reuses the leaderboard number formatters; route-isolation backlog */
import {
  formatCount,
  formatPercent,
  formatSignedUsd,
} from '../../../../SocialLeaderboard/utils/formatters';
/* eslint-enable import-x/no-restricted-paths */
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import TraderMuteChip from '../../../../SocialLeaderboard/components/TraderMuteChip';
import TraderAvatar from './TraderAvatar';

const MUTE_CHIP_DIAMETER = 40;

const AVATAR_SIZE = 40;
// Medal height that keeps the badge tucked into the avatar's bottom-right
// corner rather than dominating it (the default 30 is sized for a standalone
// podium).
const SOCIAL_V1_MEDAL_HEIGHT = 24;
// At or above this win rate the tag switches to the highlighted treatment.
const ELITE_WIN_RATE_PERCENT = 90;
// Fixed row height so the skeleton placeholder can match it exactly without
// drifting due to font-scale or button-size differences.
export const TRADER_ROW_HEIGHT = 71;
export const SOCIAL_V1_TRADER_ROW_HEIGHT = 72;

/**
 * The figure shown under the username. Callers that rank by something other
 * than PnL (e.g. the leaderboard's Sort by control) pass the ranked value here
 * so the row shows what the list is ordered by.
 */
export interface TraderRowMetric {
  /** Pre-formatted value, e.g. `+$45,900.89`, `+43.00%` or `92%`. */
  label: string;
  /** Renders the value in success green rather than error red. */
  isPositive: boolean;
}

export interface TraderRowProps {
  trader: TopTrader;
  /** Opts into the denser, metrics-first Social V1 leaderboard treatment. */
  variant?: 'default' | 'socialV1';
  /** Defaults to the trader's PnL for the loaded window. */
  metric?: TraderRowMetric;
  onFollowPress: (traderId: string) => void;
  onTraderPress?: (
    traderId: string,
    traderName: string,
    /* Used downstream for podium decoration */
    overallRank: number,
  ) => void;
  /** Whether this trader's alerts are paused. Only used when muting is shown. */
  isMuted?: boolean;
  /**
   * When true (and the trader is followed), render the inline mute chip beside
   * the Follow button. Gated by the caller on push-notification availability.
   */
  showMute?: boolean;
  /** Toggles the muted state for this trader. */
  onMuteToggle?: (traderId: string) => void;
  testID?: string;
}

/**
 * TraderRow -- a single row in the Top Traders leaderboard.
 *
 * Displays the trader's avatar (with a podium medal badge for ranks 1–3),
 * username, the ranked metric, and a Follow / Following toggle button.
 */
const TraderRow: React.FC<TraderRowProps> = ({
  trader,
  variant = 'default',
  metric,
  onFollowPress,
  onTraderPress,
  isMuted = false,
  showMute = false,
  onMuteToggle,
  testID,
}) => {
  const tw = useTailwind();

  const metricText = metric?.label ?? formatSignedUsd(trader.pnlValue);
  const isMetricPositive = metric?.isPositive ?? trader.pnlValue >= 0;
  const showMedal = isTopRank(trader.rank);
  const canShowMuteChip = showMute && Boolean(onMuteToggle);
  const isSocialV1 = variant === 'socialV1';

  const handleMutePress = React.useCallback(() => {
    onMuteToggle?.(trader.id);
  }, [onMuteToggle, trader.id]);

  if (isSocialV1) {
    const isEliteWinRate =
      (trader.winRatePercent ?? 0) >= ELITE_WIN_RATE_PERCENT;
    const winRateLabel = strings('social_leaderboard.win_rate_tag', {
      winRate: formatPercent(trader.winRatePercent, {
        showSign: false,
        decimals: 0,
      }),
    });
    const followerLabel = strings(
      trader.followerCount === 1
        ? 'social_leaderboard.trader_profile.followers_count'
        : 'social_leaderboard.trader_profile.followers_count_plural',
      { count: formatCount(trader.followerCount) },
    );
    const roi = formatPercent(trader.percentageChange, { decimals: 1 });

    return (
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
                <RankMedal rank={trader.rank} size={SOCIAL_V1_MEDAL_HEIGHT} />
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
              {trader.winRatePercent !== null && (
                <Tag
                  severity={
                    isEliteWinRate ? TagSeverity.Warning : TagSeverity.Neutral
                  }
                  startIconName={isEliteWinRate ? IconName.Trophy : undefined}
                  twClassName="shrink-0"
                >
                  {winRateLabel}
                </Tag>
              )}
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
    );
  }

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="px-4"
      style={{ height: TRADER_ROW_HEIGHT }}
      testID={testID ?? `trader-row-${trader.id}`}
    >
      <TouchableOpacity
        activeOpacity={onTraderPress ? 0.7 : 1}
        onPress={
          onTraderPress
            ? () =>
                onTraderPress(trader.id, trader.username, trader.overallRank)
            : undefined
        }
        style={tw.style('flex-1 min-w-0 mr-3')}
        disabled={!onTraderPress}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={4}
        >
          <Box>
            <TraderAvatar
              imageUrl={trader.avatarUri}
              address={trader.address}
              size={AVATAR_SIZE}
              recyclingKey={trader.id}
            />
            {showMedal ? (
              // Offset so the medal bottom (incl. its 2px border) sits ~10px
              // below the avatar's bottom edge.
              <Box twClassName="absolute -bottom-[10px] -right-2">
                <RankMedal rank={trader.rank} />
              </Box>
            ) : null}
          </Box>

          <Box twClassName="flex-1 min-w-0">
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextDefault}
              numberOfLines={1}
            >
              {trader.username}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              numberOfLines={1}
              twClassName={
                isMetricPositive ? 'text-success-default' : 'text-error-default'
              }
            >
              {metricText}
            </Text>
          </Box>
        </Box>
      </TouchableOpacity>

      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
      >
        <Button
          variant={
            trader.isFollowing ? ButtonVariant.Secondary : ButtonVariant.Primary
          }
          size={ButtonSize.Md}
          onPress={() => onFollowPress(trader.id)}
          twClassName="self-center"
        >
          {trader.isFollowing
            ? strings('social_leaderboard.following')
            : strings('social_leaderboard.follow')}
        </Button>
        {canShowMuteChip && (
          <TraderMuteChip
            isMuted={isMuted}
            visible={trader.isFollowing}
            onPress={handleMutePress}
            diameter={MUTE_CHIP_DIAMETER}
            traderName={trader.username}
            testID={`trader-row-mute-chip-${trader.id}`}
          />
        )}
      </Box>
    </Box>
  );
};

export default React.memo(TraderRow);
