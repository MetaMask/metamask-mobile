import React from 'react';
import { View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../../../util/theme';

const SKELETON_ROWS = 2;

const PerpsPositionRowSkeleton: React.FC = () => {
  const { colors } = useTheme();
  const tw = useTailwind();

  return (
    <SkeletonPlaceholder
      backgroundColor={colors.background.section}
      highlightColor={colors.background.subsection}
    >
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <View key={index} style={tw.style('flex-row items-center py-3 gap-3')}>
          <View style={tw.style('w-9 h-9 rounded-full')} />
          <View style={tw.style('flex-1 gap-1')}>
            <View style={tw.style('h-4 rounded-md w-[55%]')} />
            <View style={tw.style('h-3.5 rounded-md w-[35%]')} />
          </View>
          <View style={tw.style('items-end gap-1')}>
            <View style={tw.style('h-4 rounded-md w-14')} />
            <View style={tw.style('h-3.5 rounded-md w-10')} />
          </View>
        </View>
      ))}
    </SkeletonPlaceholder>
  );
};

export default React.memo(PerpsPositionRowSkeleton);
