import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { useTheme } from '../../../../../util/theme';
import { SOCIAL_V1_TRADER_ROW_HEIGHT } from './SocialV1TraderRow';

/**
 * SocialV1TraderRowSkeleton -- loading placeholder mirroring
 * `SocialV1TraderRow`.
 *
 * Bar widths trace the real row: avatar, then the username and follower lines,
 * then the right-aligned metric / ROI pair. Outer wrapper height is locked to
 * `SOCIAL_V1_TRADER_ROW_HEIGHT` so the skeleton occupies the exact same
 * vertical space as a rendered row.
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
          {/* Avatar placeholder */}
          <Box style={tw.style('w-10 h-10 rounded-full mr-3')} />

          {/* Username + follower-count lines */}
          <Box style={tw.style('flex-1 gap-1')}>
            <Box style={tw.style('w-24 h-5 rounded')} />
            <Box style={tw.style('w-20 h-4 rounded')} />
          </Box>

          {/* Right-aligned metric / ROI pair */}
          <Box style={tw.style('items-end gap-1 ml-3')}>
            <Box style={tw.style('w-28 h-5 rounded')} />
            <Box style={tw.style('w-12 h-4 rounded')} />
          </Box>
        </Box>
      </SkeletonPlaceholder>
    </Box>
  );
};

export default SocialV1TraderRowSkeleton;
