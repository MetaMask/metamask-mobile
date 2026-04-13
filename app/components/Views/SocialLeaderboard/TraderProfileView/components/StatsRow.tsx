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
import { strings } from '../../../../../../locales/i18n';
import type { TraderStats } from '@metamask/social-controllers';
import { formatPnl } from '../../../Homepage/Sections/TopTraders/utils/formatPnl';

export interface StatsRowProps {
  stats: TraderStats;
}

const StatsRow: React.FC<StatsRowProps> = ({ stats }) => {
  const winRate =
    stats.winRate30d != null
      ? `${Math.round(stats.winRate30d * 100)}%`
      : '\u2014';
  const isWinRatePositive = (stats.winRate30d ?? 0) > 0;

  const hasPnl = stats.pnl30d != null;
  const pnl = hasPnl ? formatPnl(stats.pnl30d) : '\u2014';
  const isPnlPositive = hasPnl && stats.pnl30d >= 0;

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.SpaceAround}
      twClassName="px-4 py-3"
      testID="trader-profile-stats-row"
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
          color={TextColor.TextMuted}
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
          color={TextColor.TextMuted}
        >
          {strings('social_leaderboard.trader_profile.pnl_30d')}
        </Text>
      </Box>

      <Box alignItems={BoxAlignItems.Center} twClassName="flex-1">
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
        >
          {'\u2014'}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextMuted}
        >
          {strings('social_leaderboard.trader_profile.avg_hold')}
        </Text>
      </Box>
    </Box>
  );
};

export default StatsRow;
