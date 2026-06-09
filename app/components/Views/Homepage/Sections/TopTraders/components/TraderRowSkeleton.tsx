import React from 'react';
import { View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../../util/theme';
import { TRADER_ROW_HEIGHT } from './TraderRow';

/**
 * TraderRowSkeleton — loading placeholder that mirrors the TraderRow layout.
 *
 * Uses react-native-skeleton-placeholder to animate shimmer effect
 * over rank, avatar, username/stats text, and action button shapes.
 *
 * Outer wrapper height is locked to `TRADER_ROW_HEIGHT` so the skeleton
 * occupies the exact same vertical space as a rendered <TraderRow />.
 */
const TraderRowSkeleton: React.FC = () => {
  const tw = useTailwind();
  const { colors } = useTheme();

  return (
    <View
      style={[tw.style('px-4 justify-center'), { height: TRADER_ROW_HEIGHT }]}
    >
      <SkeletonPlaceholder
        backgroundColor={colors.background.section}
        highlightColor={colors.background.subsection}
      >
        <View style={tw.style('flex-row items-center')}>
          {/* Rank placeholder — outer cell mirrors the rendered rank's
              `w-8 text-right` (32px container, content right-aligned) so the
              bar's visible right edge lines up with where the loaded digit
              sits. The inner bar's width (`w-4`) approximates a 1–2 digit
              rank glyph. */}
          <View style={tw.style('w-8 mr-3 items-end')}>
            <View style={tw.style('w-4 h-5 rounded')} />
          </View>

          {/* Avatar placeholder */}
          <View style={tw.style('w-10 h-10 rounded-full mr-3')} />

          {/* Text info placeholder — total height matches the avatar (40px)
              so the two bars line up with the actual BodyMd + BodySm text rows
              (~20px + ~16px) and don't appear vertically centered with gaps. */}
          <View style={tw.style('flex-1 gap-1')}>
            <View style={tw.style('w-24 h-5 rounded')} />
            <View style={tw.style('w-40 h-4 rounded')} />
          </View>

          {/* Button placeholder — `min-w-[96px]` matches the rendered Follow
              button so the right edge of the row aligns between states. */}
          <View style={tw.style('w-24 h-8 rounded-xl ml-3')} />
        </View>
      </SkeletonPlaceholder>
    </View>
  );
};

export default TraderRowSkeleton;
