import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import { View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { useTheme } from '../../../../../../util/theme';
import { TOP_TRADER_CARD_HEIGHT, TOP_TRADER_CARD_WIDTH } from './TopTraderCard';

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
        `w-[${TOP_TRADER_CARD_WIDTH}px] h-[${TOP_TRADER_CARD_HEIGHT}px] rounded-2xl bg-muted p-4`,
      )}
    >
      <SkeletonPlaceholder
        backgroundColor={colors.background.section}
        highlightColor={colors.background.subsection}
      >
        {/* Mirrors the loaded TopTraderCard's structure AND its exact
            vertical metrics so every shimmer shape lands on the same pixel
            as its loaded counterpart */}
        <View style={tw.style('gap-1')}>
          <View style={tw.style('items-center gap-1')}>
            <View style={tw.style('w-[60px] h-[60px] rounded-full')} />
            <View style={tw.style('items-center gap-0.5')}>
              <View style={tw.style('w-24 h-6 rounded')} />
              <View style={tw.style('w-32 h-[22px] rounded')} />
            </View>
          </View>
          <View style={tw.style('h-10 rounded-xl')} />
        </View>
      </SkeletonPlaceholder>
    </View>
  );
};

export default TopTraderCardSkeleton;
