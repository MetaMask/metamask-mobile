import React from 'react';
import { Box, ImageOrSvg } from '@metamask/design-system-react-native';

/** Full designer-supplied artwork, including its transparent margins. */
export function NativePackFoil({
  source,
  name,
  height,
  aspectRatio = 3 / 5,
  testID,
}: {
  source: number;
  name: string;
  height?: number;
  aspectRatio?: number;
  testID?: string;
}) {
  return (
    <Box
      twClassName={`overflow-hidden${height === undefined ? ' w-full' : ''}`}
      style={
        height === undefined
          ? { aspectRatio }
          : { width: height * aspectRatio, height }
      }
    >
      <ImageOrSvg
        src={source}
        width="100%"
        height="100%"
        imageProps={{
          contentFit: 'contain',
          cachePolicy: 'memory-disk',
          recyclingKey: String(source),
          accessibilityLabel: name,
          testID,
        }}
      />
    </Box>
  );
}
