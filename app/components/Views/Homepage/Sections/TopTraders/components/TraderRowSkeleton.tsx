import React from 'react';
import { View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../../util/theme';

/**
 * TraderRowSkeleton — loading placeholder that mirrors the TraderRow layout.
 *
 * Uses react-native-skeleton-placeholder to animate shimmer effect
 * over rank, avatar, username/stats text, and action button shapes.
 */
const TraderRowSkeleton: React.FC = () => {
  const tw = useTailwind();
  const { colors } = useTheme();

  return (
    <View style={tw.style('px-4 py-3')}>
      <SkeletonPlaceholder
        backgroundColor={colors.background.section}
        highlightColor={colors.background.subsection}
      >
        <View style={tw.style('flex-row items-center')}>
          {/* Rank placeholder */}
          <View style={tw.style('w-8 h-4 rounded mr-3')} />

          {/* Avatar placeholder */}
          <View style={tw.style('w-10 h-10 rounded-full mr-3')} />

          {/* Text info placeholder */}
          <View style={tw.style('flex-1 gap-1.5')}>
            <View style={tw.style('w-24 h-4 rounded')} />
            <View style={tw.style('w-40 h-3 rounded')} />
          </View>

          {/* Button placeholder */}
          <View style={tw.style('w-20 h-8 rounded-xl ml-3')} />
        </View>
      </SkeletonPlaceholder>
    </View>
  );
};

export default TraderRowSkeleton;
