import React from 'react';
import { Duration } from 'luxon';
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
import { TraderProfileViewSelectorsIDs } from '../TraderProfileView.testIds';

export interface StatsRowProps {
  stats: TraderStats;
  holdTimeMinutes?: number | null;
}

function formatHoldTime(minutes: number): string {
  const duration = Duration.fromObject({ minutes }).shiftTo(
    'days',
    'hours',
    'minutes',
  );

  if (duration.days >= 1) {
    return strings('social_leaderboard.trader_profile.hold_time_days', {
      count: parseFloat(duration.as('days').toFixed(1)),
    });
  }
  if (duration.hours >= 1) {
    return strings('social_leaderboard.trader_profile.hold_time_hours', {
      count: parseFloat(duration.as('hours').toFixed(1)),
    });
  }
  return strings('social_leaderboard.trader_profile.hold_time_minutes', {
    count: Math.round(duration.minutes),
  });
}

const StatsRow: React.FC<StatsRowProps> = ({ stats, holdTimeMinutes }) => {
  const winRate =
    stats.winRate30d != null
      ? `${Math.round(stats.winRate30d * 100)}%`
      : '\u2014';
  const isWinRatePositive = (stats.winRate30d ?? 0) > 0;

  const hasPnl = stats.pnl30d != null;
  const pnl = stats.pnl30d != null ? formatPnl(stats.pnl30d) : '\u2014';
  const isPnlPositive = stats.pnl30d != null && stats.pnl30d >= 0;

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Around}
      twClassName="px-4 py-3"
      testID={TraderProfileViewSelectorsIDs.STATS_ROW}
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
          {holdTimeMinutes != null ? formatHoldTime(holdTimeMinutes) : '\u2014'}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
        >
          {strings('social_leaderboard.trader_profile.hold_time')}
        </Text>
      </Box>
    </Box>
  );
};

export default StatsRow;
