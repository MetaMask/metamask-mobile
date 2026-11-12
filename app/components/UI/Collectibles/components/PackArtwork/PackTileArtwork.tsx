import React from 'react';
import { Box, ImageOrSvg } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { PackArtwork } from '../../constants/packArtwork';
import { NativePackFoil } from '../CollectiblesDiscovery/NativePackFoil';
import { PACK_TILE_ARTWORK_ASPECT_RATIO } from '../PackCard/PackCard.layout';

/** Pack artwork in a stable 203:338 frame with the list-specific inset; export margins are preserved. */
export function PackTileArtwork({
  artwork,
  name,
  testID,
  padding = 2,
}: {
  artwork: PackArtwork;
  name: string;
  testID: string;
  padding?: 2 | 3;
}) {
  const tw = useTailwind();
  return (
    <Box padding={padding} twClassName="w-full overflow-hidden">
      <ImageOrSvg
        src={artwork.image}
        width="100%"
        height="100%"
        style={tw.style('absolute inset-0', {
          opacity: 0.15,
          transform: [{ scale: 1.1 }],
        })}
        imageProps={{
          contentFit: 'cover',
          blurRadius: 16,
          cachePolicy: 'memory-disk',
          recyclingKey: String(artwork.image),
          accessibilityElementsHidden: true,
          importantForAccessibility: 'no-hide-descendants',
        }}
      />
      <NativePackFoil
        source={artwork.image}
        name={name}
        aspectRatio={PACK_TILE_ARTWORK_ASPECT_RATIO}
        testID={testID}
      />
    </Box>
  );
}
