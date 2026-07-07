import React from 'react';
import { View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../util/theme';
import {
  SITE_TILE_BORDER_RADIUS,
  SITE_TILE_HEIGHT,
  SITE_TILE_WIDTH,
} from './SiteTileRowItem';

const SKELETON_CARD_COUNT = 3;

/** Loading strip for the dapps "Recents" / "Networks" carousels. */
const SiteTileSkeleton: React.FC = () => {
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
              width: SITE_TILE_WIDTH,
              height: SITE_TILE_HEIGHT,
              borderRadius: SITE_TILE_BORDER_RADIUS,
            }}
          />
        ))}
      </View>
    </SkeletonPlaceholder>
  );
};

export default React.memo(SiteTileSkeleton);
