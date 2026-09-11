import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import { View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { useTheme } from '../../../../../../util/theme';
import { TOP_TRADER_CARD_WIDTH } from './TopTraderCard';

/**
 * TopTraderCardSkeleton -- loading placeholder that mirrors the TopTraderCard layout.
 *
 * Wrapper dimensions are locked to the same fixed footprint as `TopTraderCard`
 * so loading and loaded states never shift the carousel layout.
 */
const TopTraderCardSkeleton: React.FC = () => {
  const tw = useTailwind();
  const { colors } = useTheme();

  return (
    <View
      style={tw.style(
        `w-[${TOP_TRADER_CARD_WIDTH}px] h-auto rounded-xl bg-muted p-4`,
      )}
    >
      <SkeletonPlaceholder
        backgroundColor={colors.background.section}
        highlightColor={colors.background.subsection}
      >
        <View style={tw.style('gap-4')}>
          <View style={tw.style('flex-row items-center gap-2')}>
            <View style={tw.style('w-10 h-10 rounded-full')} />
            <View style={tw.style('flex-1 gap-1')}>
              <View style={tw.style('w-16 h-5 rounded')} />
              <View style={tw.style('w-20 h-4 rounded')} />
            </View>
          </View>
          <View style={tw.style('w-20 h-8 rounded-lg')} />
        </View>
      </SkeletonPlaceholder>
    </View>
  );
};

export default TopTraderCardSkeleton;
