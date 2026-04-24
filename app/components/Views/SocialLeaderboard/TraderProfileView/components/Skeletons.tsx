import React from 'react';
import { View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../util/theme';

/**
 * Shared wrapper that supplies the outer padding and the SkeletonPlaceholder
 * shimmer shell with theme-appropriate colours. Each specific skeleton only
 * needs to describe its inner shape.
 *
 * Exported so sibling feature screens can reuse the same shimmer style.
 */
export const SkeletonShell: React.FC<{ children: React.ReactElement }> = ({
  children,
}) => {
  const { colors } = useTheme();
  const tw = useTailwind();

  return (
    <View style={tw.style('px-4 py-3')}>
      <SkeletonPlaceholder
        backgroundColor={colors.background.section}
        highlightColor={colors.background.subsection}
      >
        {children}
      </SkeletonPlaceholder>
    </View>
  );
};

export const ProfileHeaderSkeleton: React.FC = () => {
  const tw = useTailwind();
  return (
    <SkeletonShell>
      <View style={tw.style('flex-row items-center')}>
        <View style={tw.style('w-10 h-10 rounded-full mr-4')} />
        <View style={tw.style('flex-1 gap-1.5')}>
          <View style={tw.style('w-28 h-5 rounded')} />
          <View style={tw.style('w-20 h-3 rounded')} />
        </View>
        <View style={tw.style('w-20 h-8 rounded-xl ml-3')} />
      </View>
    </SkeletonShell>
  );
};

export const StatsRowSkeleton: React.FC = () => {
  const tw = useTailwind();
  return (
    <SkeletonShell>
      <View style={tw.style('flex-row justify-around')}>
        <View style={tw.style('items-center gap-1')}>
          <View style={tw.style('w-12 h-5 rounded')} />
          <View style={tw.style('w-16 h-3 rounded')} />
        </View>
        <View style={tw.style('items-center gap-1')}>
          <View style={tw.style('w-16 h-5 rounded')} />
          <View style={tw.style('w-14 h-3 rounded')} />
        </View>
        <View style={tw.style('items-center gap-1')}>
          <View style={tw.style('w-14 h-5 rounded')} />
          <View style={tw.style('w-16 h-3 rounded')} />
        </View>
      </View>
    </SkeletonShell>
  );
};

export const PositionRowSkeleton: React.FC = () => {
  const tw = useTailwind();
  return (
    <SkeletonShell>
      <View style={tw.style('flex-row items-center')}>
        <View style={tw.style('w-10 h-10 rounded-full mr-4')} />
        <View style={tw.style('flex-1 gap-1.5')}>
          <View style={tw.style('w-20 h-4 rounded')} />
          <View style={tw.style('w-28 h-3 rounded')} />
        </View>
        <View style={tw.style('items-end gap-1.5')}>
          <View style={tw.style('w-20 h-4 rounded')} />
          <View style={tw.style('w-12 h-3 rounded')} />
        </View>
      </View>
    </SkeletonShell>
  );
};
