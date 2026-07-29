import React from 'react';
import { View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../util/theme';

/** Maximum number of DeFi positions shown in the homepage section. */
export const MAX_POSITIONS_DISPLAYED = 5;

export interface DeFiSectionProps {
  sectionIndex: number;
  totalSectionsLoaded: number;
}

/**
 * Skeleton placeholder for loading / idle state - matches DeFi list item layout.
 * Idle uses a shorter skeleton so the section stays measurable (≥30% viewport).
 */
export const DeFiPositionsSkeleton = ({ rows = 3 }: { rows?: number }) => {
  const { colors } = useTheme();
  const tw = useTailwind();

  return (
    <SkeletonPlaceholder
      backgroundColor={colors.background.section}
      highlightColor={colors.background.subsection}
    >
      <View style={tw.style('gap-4')}>
        {Array.from({ length: rows }, (_, index) => (
          <View
            key={index}
            style={tw.style('flex-row items-center gap-5 py-2')}
          >
            <View style={tw.style('w-10 h-10 rounded-full')} />
            <View style={tw.style('flex-1 gap-1')}>
              <View style={tw.style('w-32 h-5 rounded')} />
              <View style={tw.style('w-24 h-4 rounded')} />
            </View>
            <View style={tw.style('items-end gap-1')}>
              <View style={tw.style('w-16 h-5 rounded')} />
              <View style={tw.style('w-12 h-4 rounded')} />
            </View>
          </View>
        ))}
      </View>
    </SkeletonPlaceholder>
  );
};
