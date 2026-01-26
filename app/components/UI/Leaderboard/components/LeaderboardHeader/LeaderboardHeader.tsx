import React from 'react';
import {
  Box,
  Text,
  TextVariant,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { LeaderboardTestIds } from '../../Leaderboard.testIds';

/**
 * Header row for the leaderboard table
 */
const LeaderboardHeader: React.FC = () => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    twClassName="border-b border-muted"
    testID={LeaderboardTestIds.HEADER_ROW}
  >
    {/* Rank */}
    <Box twClassName="w-10">
      <Text variant={TextVariant.BodySm} twClassName="text-muted">
        {strings('leaderboard.rank')}
      </Text>
    </Box>

    {/* Trader */}
    <Box twClassName="flex-1">
      <Text variant={TextVariant.BodySm} twClassName="text-muted">
        {strings('leaderboard.trader')}
      </Text>
    </Box>

    {/* Followers */}
    <Box twClassName="w-16" alignItems={BoxAlignItems.Center}>
      <Text variant={TextVariant.BodySm} twClassName="text-muted">
        {strings('leaderboard.followers')}
      </Text>
    </Box>

    {/* PnL (30D) */}
    <Box twClassName="w-20" alignItems={BoxAlignItems.End}>
      <Text variant={TextVariant.BodySm} twClassName="text-muted">
        {strings('leaderboard.pnl_30d')}
      </Text>
    </Box>
  </Box>
);

export default LeaderboardHeader;
