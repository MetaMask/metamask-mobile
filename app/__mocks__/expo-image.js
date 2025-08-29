// Mock for expo-image to fix EventEmitter errors in tests
// This mock provides all the functionality used by the Perps components
/* eslint-disable react/prop-types */

import React from 'react';
import { View } from 'react-native';

// Mock Image component
export const Image = React.forwardRef((props, ref) => {
  const {
    source,
    style,
    onLoadStart,
    onLoadEnd,
    onError,
    onLoad,
    testID,
    recyclingKey,
    ...restProps
  } = props;

  // Simulate async image loading behavior
  React.useEffect(() => {
    if (onLoadStart) {
      onLoadStart();
    }

    // Simulate successful load
    const loadTimer = setTimeout(() => {
      if (onLoad) {
        onLoad({ source: { width: 100, height: 100 } });
      }
      if (onLoadEnd) {
        onLoadEnd();
      }
    }, 0);

    return () => clearTimeout(loadTimer);
  }, [source, onLoadStart, onLoad, onLoadEnd]);

  return <View ref={ref} testID={testID} style={style} {...restProps} />;
});

Image.displayName = 'MockedExpoImage';

// Mock static methods
Image.prefetch = jest.fn(() => Promise.resolve(true));

Image.clearDiskCache = jest.fn(() => Promise.resolve());
Image.clearMemoryCache = jest.fn(() => Promise.resolve());
Image.getCachePathAsync = jest.fn((url) => Promise.resolve(`/cache/${url}`));
Image.generateBlurhashAsync = jest.fn(() =>
  Promise.resolve('LEHV6nWB2yk8pyo0adR*.7kCMdnj'),
);

// Export constants
export const ImageContentFit = {
  contain: 'contain',
  cover: 'cover',
  fill: 'fill',
  none: 'none',
  'scale-down': 'scale-down',
};

export const ImageContentPosition = {
  center: 'center',
  top: 'top',
  right: 'right',
  bottom: 'bottom',
  left: 'left',
  'top-right': 'top-right',
  'top-left': 'top-left',
  'bottom-right': 'bottom-right',
  'bottom-left': 'bottom-left',
};

export const ImageTransition = {
  none: 0,
  crossDissolve: 1,
  flip: 2,
};

export const ImageCachePolicy = {
  none: 'none',
  disk: 'disk',
  memory: 'memory',
  'memory-disk': 'memory-disk',
};

export const ImagePriority = {
  low: 'low',
  normal: 'normal',
  high: 'high',
};

// Export default
export default {
  Image,
  ImageContentFit,
  ImageContentPosition,
  ImageTransition,
  ImageCachePolicy,
  ImagePriority,
};
