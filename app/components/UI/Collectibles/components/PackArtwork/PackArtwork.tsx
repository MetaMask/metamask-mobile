import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  ImageOrSvg,
} from '@metamask/design-system-react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../util/theme';
import type { PackArtwork as Artwork } from '../../constants/packArtwork';
import { NativePackFoil } from '../CollectiblesDiscovery/NativePackFoil';

/** Full pack artwork over a soft enlarged echo of its illustration. */
const PackArtwork = ({
  artwork,
  name,
  height,
}: {
  artwork: Artwork;
  name: string;
  height: number;
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  return (
    <Box
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      style={{ height }}
      twClassName="w-full shrink-0 overflow-hidden"
    >
      <ImageOrSvg
        src={artwork.image}
        width="100%"
        height={height}
        style={tw.style('absolute inset-0 opacity-25')}
        imageProps={{
          contentFit: 'cover',
          blurRadius: 16,
          cachePolicy: 'memory-disk',
          recyclingKey: String(artwork.image),
          accessibilityElementsHidden: true,
          importantForAccessibility: 'no-hide-descendants',
        }}
      />
      <LinearGradient
        colors={['transparent', colors.background.default]}
        style={tw.style('absolute inset-0')}
      />
      <NativePackFoil source={artwork.image} name={name} height={height - 32} />
    </Box>
  );
};
export default PackArtwork;
