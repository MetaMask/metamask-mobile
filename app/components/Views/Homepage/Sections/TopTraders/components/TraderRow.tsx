import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { strings } from '../../../../../../../locales/i18n';
import { RankMedal, isTopRank } from '../topRank';
import type { TopTrader } from '../types';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { formatSignedUsd } from '../../../../SocialLeaderboard/utils/formatters';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import TraderMuteChip from '../../../../SocialLeaderboard/components/TraderMuteChip';
import TraderAvatar from './TraderAvatar';

const MUTE_CHIP_DIAMETER = 40;

const AVATAR_SIZE = 40;
// Fixed row height so the skeleton placeholder can match it exactly without
// drifting due to font-scale or button-size differences.
export const TRADER_ROW_HEIGHT = 71;

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

  const handleMutePress = React.useCallback(() => {
    onMuteToggle?.(trader.id);
  }, [onMuteToggle, trader.id]);

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
          <View>
            <TraderAvatar
              imageUrl={trader.avatarUri}
              address={trader.address}
              size={AVATAR_SIZE}
              recyclingKey={trader.id}
            />
            {showMedal ? (
              // Offset so the medal bottom (incl. its 2px border) sits ~10px
              // below the avatar's bottom edge.
              <View style={tw.style('absolute -bottom-[10px] -right-2')}>
                <RankMedal rank={trader.rank} />
              </View>
            ) : null}
          </View>

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
