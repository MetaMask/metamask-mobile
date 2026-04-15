import React from 'react';
import { View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../../util/theme';

/**
 * TopTraderCardSkeleton -- loading placeholder that mirrors the TopTraderCard layout.
 */
const TopTraderCardSkeleton: React.FC = () => {
  const tw = useTailwind();
  const { colors } = useTheme();

  return (
    <View style={tw.style('w-[200px] rounded-2xl bg-muted p-4')}>
      <SkeletonPlaceholder
        backgroundColor={colors.background.section}
        highlightColor={colors.background.subsection}
      >
        <View style={tw.style('items-start gap-2')}>
          <View style={tw.style('w-10 h-10 rounded-full')} />
          <View style={tw.style('w-24 h-5 rounded self-center')} />
          <View style={tw.style('w-36 h-3 rounded self-center')} />
          <View style={tw.style('w-full h-8 rounded-xl')} />
        </View>
      </SkeletonPlaceholder>
    </View>
  );
};

export default TopTraderCardSkeleton;
