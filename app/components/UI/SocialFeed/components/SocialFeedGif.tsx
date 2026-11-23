import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useCallback, useState } from 'react';
import { Image, type ImageLoadEvent } from 'react-native';

/** Used until the GIF reports its size. */
const DEFAULT_ASPECT_RATIO = 1;
/** Portrait GIFs stop at 4:5 so a tall one cannot take over the feed. */
const MIN_ASPECT_RATIO = 4 / 5;
const MAX_ASPECT_RATIO = 3;

/**
 * Measured ratios by URI, so a recycled or remounted row lays out at the right
 * height straight away instead of jumping from square.
 */
const aspectRatioCache = new Map<string, number>();

export const clampGifAspectRatio = (width: number, height: number): number => {
  if (!(width > 0) || !(height > 0)) {
    return DEFAULT_ASPECT_RATIO;
  }
  return Math.min(MAX_ASPECT_RATIO, Math.max(MIN_ASPECT_RATIO, width / height));
};

export interface SocialFeedGifProps {
  uri: string;
  testID?: string;
}

/** A feed or composer GIF at its own aspect ratio, full width. */
const SocialFeedGif: React.FC<SocialFeedGifProps> = ({ uri, testID }) => {
  const tw = useTailwind();
  const [measured, setMeasured] = useState<{
    uri: string;
    ratio: number;
  } | null>(null);
  const aspectRatio =
    (measured?.uri === uri ? measured.ratio : undefined) ??
    aspectRatioCache.get(uri) ??
    DEFAULT_ASPECT_RATIO;

  const handleLoad = useCallback(
    (event: ImageLoadEvent) => {
      const { width, height } = event.nativeEvent.source;
      const ratio = clampGifAspectRatio(width, height);
      aspectRatioCache.set(uri, ratio);
      setMeasured({ uri, ratio });
    },
    [uri],
  );

  return (
    <Image
      source={{ uri }}
      onLoad={handleLoad}
      resizeMode="cover"
      style={[tw.style('w-full'), { aspectRatio }]}
      testID={testID}
    />
  );
};

export default SocialFeedGif;
