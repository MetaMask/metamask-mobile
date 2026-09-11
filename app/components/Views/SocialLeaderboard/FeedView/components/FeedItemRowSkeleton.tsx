import React from 'react';
import { View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../util/theme';

/**
 * Placeholder row shown while the trader feed loads. Mirrors the two-part
 * `FeedItemRow` layout: a trader/action line with a Trade pill on top, and the
 * indented detail card (token icon, symbol/sub-header, value/P&L) below.
 */
const FeedItemRowSkeleton: React.FC = () => {
  const { colors } = useTheme();
  const tw = useTailwind();

  return (
    <View style={tw.style('px-4 py-2')}>
      <SkeletonPlaceholder
        backgroundColor={colors.background.section}
        highlightColor={colors.background.subsection}
      >
        <View style={tw.style('gap-4')}>
          <View style={tw.style('flex-row items-center justify-between')}>
            <View style={tw.style('flex-row items-center gap-2 flex-1')}>
              <View style={tw.style('w-6 h-6 rounded-full')} />
              <View style={tw.style('w-40 h-3 rounded')} />
            </View>
            <View style={tw.style('w-16 h-8 rounded-full')} />
          </View>
          <View style={tw.style('flex-row items-center gap-3')}>
            <View style={tw.style('w-8 h-8 rounded-full')} />
            <View style={tw.style('flex-1 gap-1.5')}>
              <View style={tw.style('w-24 h-4 rounded')} />
              <View style={tw.style('w-32 h-3 rounded')} />
            </View>
            <View style={tw.style('items-end gap-1.5')}>
              <View style={tw.style('w-20 h-4 rounded')} />
              <View style={tw.style('w-12 h-3 rounded')} />
            </View>
          </View>
        </View>
      </SkeletonPlaceholder>
    </View>
  );
};

export default FeedItemRowSkeleton;
