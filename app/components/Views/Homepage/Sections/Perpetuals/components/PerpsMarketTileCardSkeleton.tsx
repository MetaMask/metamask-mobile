import React from 'react';
import { View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../../util/theme';

const CARD_WIDTH = 180;
const CARD_HEIGHT = 180;
const CARD_BORDER_RADIUS = 12;
const SKELETON_CARD_COUNT = 3;

const PerpsMarketTileCardSkeleton: React.FC = () => {
  const { colors } = useTheme();
  const tw = useTailwind();

  return (
    <SkeletonPlaceholder
      backgroundColor={colors.background.section}
      highlightColor={colors.background.subsection}
    >
      <View style={tw.style('flex-row gap-2.5')}>
        {Array.from({ length: SKELETON_CARD_COUNT }, (_, i) => (
          <View
            key={i}
            style={{
              width: CARD_WIDTH,
              height: CARD_HEIGHT,
              borderRadius: CARD_BORDER_RADIUS,
            }}
          />
        ))}
      </View>
    </SkeletonPlaceholder>
  );
};

export default React.memo(PerpsMarketTileCardSkeleton);
