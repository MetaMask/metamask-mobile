import React from 'react';
import { View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { useTheme } from '../../../util/theme';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

const NftGridSkeleton = () => {
  const { colors } = useTheme();
  const tw = useTailwind();

  return (
    <View style={tw.style('flex-1 p-1')}>
      <SkeletonPlaceholder
        backgroundColor={colors.background.section}
        highlightColor={colors.background.subsection}
      >
        <View style={tw.style('flex-row flex-wrap justify-between gap-2')}>
          {Array.from({ length: 9 }, (_, index) => (
            <View key={index} style={tw.style('w-[30%] mb-2')}>
              <View style={tw.style('w-full aspect-square rounded-xl mb-3')} />
              <View>
                <View style={tw.style('h-4 rounded-lg mb-1 w-[60%]')} />
                <View style={tw.style('h-3.5 rounded-md w-full')} />
              </View>
            </View>
          ))}
        </View>
      </SkeletonPlaceholder>
    </View>
  );
};

export default NftGridSkeleton;
