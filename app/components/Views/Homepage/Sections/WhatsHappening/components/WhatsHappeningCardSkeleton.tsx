import React from 'react';
import { View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../../util/theme';

const WhatsHappeningCardSkeleton: React.FC = () => {
  const tw = useTailwind();
  const { colors } = useTheme();

  return (
    <View
      style={tw.style(
        'w-[280px] rounded-2xl bg-background-muted overflow-hidden',
      )}
    >
      <SkeletonPlaceholder
        backgroundColor={colors.background.section}
        highlightColor={colors.background.subsection}
      >
        <View style={tw.style('p-4 gap-2')}>
          <View style={tw.style('w-[85%] h-5 rounded')} />
          <View style={tw.style('w-full h-4 rounded')} />
          <View style={tw.style('w-[75%] h-4 rounded')} />
          <View style={tw.style('w-[45%] h-4 rounded')} />
          <View style={tw.style('w-[30%] h-3 rounded')} />
        </View>
      </SkeletonPlaceholder>
    </View>
  );
};

export default WhatsHappeningCardSkeleton;
