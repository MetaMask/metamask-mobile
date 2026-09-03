import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { TraderStats } from '@metamask/social-controllers';
import { TraderProfileViewSelectorsIDs } from '../TraderProfileView.testIds';
import { getTraderHeadlineStatsDisplay } from '../utils/getTraderHeadlineStatsDisplay';

export interface TraderProfileCompactStatsProps {
  stats: TraderStats;
}

const TraderProfileCompactStats: React.FC<TraderProfileCompactStatsProps> = ({
  stats,
}) => {
  const { winRate, isWinRatePositive, pnl, hasPnl, isPnlPositive } =
    getTraderHeadlineStatsDisplay(stats);

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={2}
      testID={TraderProfileViewSelectorsIDs.COMPACT_STATS}
    >
      <Text
        variant={TextVariant.BodySm}
        color={isWinRatePositive ? undefined : TextColor.TextAlternative}
        twClassName={isWinRatePositive ? 'text-success-default' : undefined}
        testID={TraderProfileViewSelectorsIDs.HEADER_COMPACT_WIN_RATE}
      >
        {winRate}
      </Text>
      <Text
        variant={TextVariant.BodySm}
        color={hasPnl ? undefined : TextColor.TextAlternative}
        twClassName={
          hasPnl
            ? isPnlPositive
              ? 'text-success-default'
              : 'text-error-default'
            : undefined
        }
        testID={TraderProfileViewSelectorsIDs.HEADER_COMPACT_PNL}
      >
        {pnl}
      </Text>
    </Box>
  );
};

export default TraderProfileCompactStats;
