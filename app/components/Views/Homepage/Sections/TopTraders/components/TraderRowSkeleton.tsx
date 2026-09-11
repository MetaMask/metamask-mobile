import React from 'react';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box } from '@metamask/design-system-react-native';
import { useTheme } from '../../../../../../util/theme';
import { SOCIAL_V1_TRADER_ROW_HEIGHT, TRADER_ROW_HEIGHT } from './TraderRow';

/**
 * TraderRowSkeleton — loading placeholder that mirrors the TraderRow layout.
 *
 * Uses react-native-skeleton-placeholder to animate shimmer effect
 * over rank, avatar, username/stats text, and action button shapes.
 *
 * Outer wrapper height is locked to `TRADER_ROW_HEIGHT` so the skeleton
 * occupies the exact same vertical space as a rendered <TraderRow />.
 */
interface TraderRowSkeletonProps {
  variant?: 'default' | 'socialV1';
}

const TraderRowSkeleton: React.FC<TraderRowSkeletonProps> = ({
  variant = 'default',
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const isSocialV1 = variant === 'socialV1';
  const rowHeight = isSocialV1
    ? SOCIAL_V1_TRADER_ROW_HEIGHT
    : TRADER_ROW_HEIGHT;

  return (
    <Box style={[tw.style('px-4 justify-center'), { height: rowHeight }]}>
      <SkeletonPlaceholder
        backgroundColor={colors.background.section}
        highlightColor={colors.background.subsection}
      >
        <Box style={tw.style('flex-row items-center')}>
          {/* Avatar placeholder */}
          <Box style={tw.style('w-10 h-10 rounded-full mr-3')} />

          {/* Text info placeholder — two bars matching the name and the
              follower / stats line beneath it. */}
          <Box style={tw.style('flex-1 gap-1')}>
            <Box style={tw.style('w-24 h-5 rounded')} />
            <Box
              style={tw.style(
                isSocialV1 ? 'w-20 h-4 rounded' : 'w-40 h-4 rounded',
              )}
            />
          </Box>

          {isSocialV1 ? (
            // Right-aligned metric bars replace the follow action on the
            // Social V1 leaderboard.
            <Box style={tw.style('items-end gap-1 ml-3')}>
              <Box style={tw.style('w-28 h-5 rounded')} />
              <Box style={tw.style('w-12 h-4 rounded')} />
            </Box>
          ) : (
            // 80×40 matches the real ButtonSize.Md follow action.
            <Box style={tw.style('w-20 h-10 rounded-xl ml-3')} />
          )}
        </Box>
      </SkeletonPlaceholder>
    </Box>
  );
};

export default TraderRowSkeleton;
