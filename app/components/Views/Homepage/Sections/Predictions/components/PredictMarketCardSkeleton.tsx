import React from 'react';
import { View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../../util/theme';

/**
 * Skeleton loader for PredictMarketCard.
 * Matches the compact card layout with shimmer effect for smooth loading transitions.
 */
const PredictMarketCardSkeleton: React.FC = () => {
  const tw = useTailwind();
  const { colors } = useTheme();

  return (
    <View style={tw.style('w-[280px] rounded-2xl bg-background-muted p-4')}>
      <SkeletonPlaceholder
        backgroundColor={colors.background.section}
        highlightColor={colors.background.subsection}
      >
        <View style={tw.style('gap-3')}>
          {/* Header skeleton */}
          <View style={tw.style('gap-1')}>
            <View style={tw.style('w-[80%] h-5 rounded')} />
            <View style={tw.style('w-[40%] h-4 rounded')} />
          </View>

          {/* Outcome rows skeleton */}
          <View style={tw.style('gap-2')}>
            {/* Outcome 1 */}
            <View style={tw.style('flex-row items-center gap-3')}>
              <View style={tw.style('w-8 h-8 rounded-lg')} />
              <View style={tw.style('flex-1')}>
                <View style={tw.style('w-[60%] h-4 rounded')} />
              </View>
              <View style={tw.style('w-12 h-8 rounded-lg')} />
            </View>

            {/* Outcome 2 */}
            <View style={tw.style('flex-row items-center gap-3')}>
              <View style={tw.style('w-8 h-8 rounded-lg')} />
              <View style={tw.style('flex-1')}>
                <View style={tw.style('w-[50%] h-4 rounded')} />
              </View>
              <View style={tw.style('w-12 h-8 rounded-lg')} />
            </View>
          </View>
        </View>
      </SkeletonPlaceholder>
    </View>
  );
};

export default PredictMarketCardSkeleton;
