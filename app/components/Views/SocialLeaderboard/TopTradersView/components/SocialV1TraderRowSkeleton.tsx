import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { useTheme } from '../../../../../util/theme';
import { SOCIAL_V1_TRADER_ROW_HEIGHT } from './SocialV1TraderRow';

/**
 * Loading placeholder matching the single-line V1 leaderboard row: rank,
 * avatar, name, metric.
 */
const SocialV1TraderRowSkeleton: React.FC = () => {
  const tw = useTailwind();
  const { colors } = useTheme();

  return (
    <Box
      style={[
        tw.style('px-4 justify-center'),
        { height: SOCIAL_V1_TRADER_ROW_HEIGHT },
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
          </Box>
          <Box style={tw.style('w-20 h-4 rounded ml-3')} />
        </Box>
      </SkeletonPlaceholder>
    </Box>
  );
};

export default SocialV1TraderRowSkeleton;
