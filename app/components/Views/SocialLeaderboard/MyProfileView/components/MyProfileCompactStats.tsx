import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { MyProfileViewSelectorsIDs } from '../MyProfileView.testIds';

export interface MyProfileCompactStatsProps {
  winRateLabel: string;
  isWinRatePositive: boolean;
  pnlLabel: string;
  hasPnl: boolean;
  isPnlPositive: boolean;
}

const MyProfileCompactStats: React.FC<MyProfileCompactStatsProps> = ({
  winRateLabel,
  isWinRatePositive,
  pnlLabel,
  hasPnl,
  isPnlPositive,
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    gap={2}
    testID={MyProfileViewSelectorsIDs.COMPACT_STATS}
  >
    <Text
      variant={TextVariant.BodySm}
      color={isWinRatePositive ? undefined : TextColor.TextAlternative}
      twClassName={isWinRatePositive ? 'text-success-default' : undefined}
      testID={MyProfileViewSelectorsIDs.HEADER_COMPACT_WIN_RATE}
    >
      {winRateLabel}
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
      testID={MyProfileViewSelectorsIDs.HEADER_COMPACT_PNL}
    >
      {pnlLabel}
    </Text>
  </Box>
);

export default MyProfileCompactStats;
