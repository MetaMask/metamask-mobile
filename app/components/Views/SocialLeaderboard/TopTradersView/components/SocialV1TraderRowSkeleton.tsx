import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { useTheme } from '../../../../../util/theme';
import {
  SOCIAL_V1_TRADER_ROW_DETAIL_HEIGHT,
  SOCIAL_V1_TRADER_ROW_HEIGHT,
} from './SocialV1TraderRow';

export interface SocialV1TraderRowSkeletonProps {
  /** Matches the taller leaderboard row that shows followers and ROI. */
  showLeaderboardDetails?: boolean;
}

/**
 * Loading placeholder matching the V1 trader row: rank, avatar, name, metric.
 * The leaderboard variant adds a second bar under the name.
 */
const SocialV1TraderRowSkeleton: React.FC<SocialV1TraderRowSkeletonProps> = ({
  showLeaderboardDetails = false,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();

  return (
    <Box
      style={[
        tw.style('px-4 justify-center'),
        {
          height: showLeaderboardDetails
            ? SOCIAL_V1_TRADER_ROW_DETAIL_HEIGHT
            : SOCIAL_V1_TRADER_ROW_HEIGHT,
        },
      ]}
    >
      <SkeletonPlaceholder
        backgroundColor={colors.background.section}
        highlightColor={colors.background.subsection}
      >
        <Box style={tw.style('flex-row items-center')}>
          <Box style={tw.style('w-6 h-4 rounded mr-3')} />
          <Box style={tw.style('w-10 h-10 rounded-full mr-3')} />
          <Box style={tw.style('flex-1')}>
            <Box style={tw.style('w-24 h-4 rounded')} />
            {showLeaderboardDetails ? (
              <Box style={tw.style('w-16 h-3 rounded mt-1')} />
            ) : null}
          </Box>
          <Box style={tw.style('ml-3')}>
            <Box style={tw.style('w-20 h-4 rounded')} />
            {showLeaderboardDetails ? (
              <Box style={tw.style('w-10 h-3 rounded mt-1 self-end')} />
            ) : null}
          </Box>
        </Box>
      </SkeletonPlaceholder>
    </Box>
  );
};

export default SocialV1TraderRowSkeleton;
