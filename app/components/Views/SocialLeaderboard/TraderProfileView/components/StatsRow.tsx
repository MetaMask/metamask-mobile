import React from 'react';
import {
  Box,
  Text,
  TextVariant,
  FontWeight,
  TextColor,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { Pressable } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import type { TraderStats } from '@metamask/social-controllers';
import { TraderProfileViewSelectorsIDs } from '../TraderProfileView.testIds';
import { getTraderHeadlineStatsDisplay } from '../utils/getTraderHeadlineStatsDisplay';
import { formatHoldTime } from '../utils/formatHoldTime';
import { EM_DASH } from '../../utils/formatters';

export interface StatsRowProps {
  stats: TraderStats;
  holdTimeMinutes?: number | null;
  onPress?: () => void;
}

const StatsRow: React.FC<StatsRowProps> = ({
  stats,
  holdTimeMinutes,
  onPress,
}) => {
  const { winRate, isWinRatePositive, pnl, hasPnl, isPnlPositive } =
    getTraderHeadlineStatsDisplay(stats);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={
        onPress
          ? strings(
              'social_leaderboard.trader_profile.stats_sheet_accessibility_label',
            )
          : undefined
      }
      testID={TraderProfileViewSelectorsIDs.STATS_ROW}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Around}
        twClassName="px-4 py-3"
      >
        <Box alignItems={BoxAlignItems.Center} twClassName="flex-1">
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            twClassName={isWinRatePositive ? 'text-success-default' : undefined}
            color={isWinRatePositive ? undefined : TextColor.TextDefault}
          >
            {winRate}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
            twClassName="text-center"
          >
            {strings('social_leaderboard.trader_profile.win_rate')}
          </Text>
        </Box>

        <Box alignItems={BoxAlignItems.Center} twClassName="flex-1">
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={hasPnl ? undefined : TextColor.TextDefault}
            twClassName={
              hasPnl
                ? isPnlPositive
                  ? 'text-success-default'
                  : 'text-error-default'
                : undefined
            }
          >
            {pnl}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
            twClassName="text-center"
          >
            {strings('social_leaderboard.trader_profile.pnl_7d')}
          </Text>
        </Box>

        <Box alignItems={BoxAlignItems.Center} twClassName="flex-1">
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
          >
            {holdTimeMinutes != null
              ? formatHoldTime(holdTimeMinutes)
              : EM_DASH}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
            twClassName="text-center"
          >
            {strings('social_leaderboard.trader_profile.hold_time')}
          </Text>
        </Box>
      </Box>
    </Pressable>
  );
};

export default StatsRow;
