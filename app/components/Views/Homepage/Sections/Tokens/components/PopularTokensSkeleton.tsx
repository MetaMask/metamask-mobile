import React from 'react';
import { View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../../util/theme';

const SKELETON_ITEM_COUNT = 5;

/**
 * Skeleton placeholder for loading state - matches PopularTokenRow layout
 */
const PopularTokensSkeleton = () => {
  const { colors } = useTheme();
  const tw = useTailwind();

  return (
    <SkeletonPlaceholder
      backgroundColor={colors.background.section}
      highlightColor={colors.background.subsection}
    >
      <View>
        {Array.from({ length: SKELETON_ITEM_COUNT }, (_, index) => (
          <View key={index} style={tw.style('flex-row items-center h-16')}>
            {/* Avatar placeholder */}
            <View style={tw.style('w-10 h-10 rounded-full')} />
            {/* Token info placeholder */}
            <View style={tw.style('flex-1 ml-5 gap-1')}>
              <View style={tw.style('w-24 h-5 rounded')} />
              <View style={tw.style('w-20 h-4 rounded')} />
            </View>
            {/* Buy button placeholder */}
            <View style={tw.style('w-16 h-8 rounded-full')} />
          </View>
        ))}
      </View>
    </SkeletonPlaceholder>
  );
};

export default PopularTokensSkeleton;
