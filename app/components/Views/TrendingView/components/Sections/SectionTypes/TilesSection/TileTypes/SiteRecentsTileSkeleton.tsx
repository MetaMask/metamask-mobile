import React from 'react';
import { View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../../../../util/theme';
import {
  SITE_RECENTS_TILE_BORDER_RADIUS,
  SITE_RECENTS_TILE_HEIGHT,
  SITE_RECENTS_TILE_WIDTH,
} from './SiteRecentsTileRowItem';

const SKELETON_CARD_COUNT = 3;

/**
 * Loading strip for Explore Dapps “Recents” — matches {@link SiteRecentsTileRowItem} size only.
 */
const SiteRecentsTileSkeleton: React.FC = () => {
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
              width: SITE_RECENTS_TILE_WIDTH,
              height: SITE_RECENTS_TILE_HEIGHT,
              borderRadius: SITE_RECENTS_TILE_BORDER_RADIUS,
            }}
          />
        ))}
      </View>
    </SkeletonPlaceholder>
  );
};

export default React.memo(SiteRecentsTileSkeleton);
