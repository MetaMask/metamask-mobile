// Mock for expo-image to fix EventEmitter errors in tests
// This mock provides all the functionality used by the Perps components

import React, { useEffect, forwardRef } from 'react';
import {
  View,
  ViewProps,
  StyleProp,
  ImageStyle,
  ViewStyle,
} from 'react-native';

// Define the ImageSource type based on expo-image's expected structure
export type ImageSource =
  | string
  | number
  | { uri: string; headers?: Record<string, string> }
  | null
  | undefined;

// Define the ImageLoadEventData type
export interface ImageLoadEventData {
  source: {
    width: number;
    height: number;
    url?: string;
    mediaType?: string;
  };
  cacheType?: 'none' | 'disk' | 'memory';
}

// Define the ImageErrorEventData type
export interface ImageErrorEventData {
  error: string;
}

// Define the ImageProgressEventData type
export interface ImageProgressEventData {
  loaded: number;
  total: number;
}

// Define the main Image props
export interface ImageProps extends Omit<ViewProps, 'style'> {
  source?: ImageSource;
  style?: StyleProp<ImageStyle>;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: (event: ImageErrorEventData) => void;
  onLoad?: (event: ImageLoadEventData) => void;
  onProgress?: (event: ImageProgressEventData) => void;
  testID?: string;
  recyclingKey?: string;
  contentFit?: keyof typeof ImageContentFit;
  contentPosition?: keyof typeof ImageContentPosition;
  transition?: number | { duration: number; timing?: string; effect?: string };
  cachePolicy?: keyof typeof ImageCachePolicy;
  priority?: keyof typeof ImagePriority;
  placeholder?: ImageSource | ImageSource[];
  placeholderContentFit?: keyof typeof ImageContentFit;
  blurRadius?: number;
  tintColor?: string;
  allowDownscaling?: boolean;
  autoplay?: boolean;
  accessible?: boolean;
  accessibilityLabel?: string;
  responsivePolicy?: 'live' | 'initial' | 'static';
  decodePolicy?: 'async' | 'sync';
}

// Mock Image component with proper typing
export const Image = forwardRef<View, ImageProps>((props, ref) => {
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
  useEffect(() => {
    if (onLoadStart) {
      onLoadStart();
    }

    // Simulate successful load
    const loadTimer = setTimeout(() => {
      if (onLoad) {
        onLoad({
          source: {
            width: 100,
            height: 100,
          },
        });
      }
      if (onLoadEnd) {
        onLoadEnd();
      }
    }, 0);

    return () => clearTimeout(loadTimer);
  }, [source, onLoadStart, onLoad, onLoadEnd]);

  return (
    <View
      ref={ref}
      testID={testID}
      style={style as StyleProp<ViewStyle>}
      {...restProps}
    />
  );
});

Image.displayName = 'MockedExpoImage';

// Define the Image type with static methods
interface ImageWithStatics
  extends React.ForwardRefExoticComponent<
    ImageProps & React.RefAttributes<View>
  > {
  prefetch: jest.Mock<
    Promise<boolean>,
    [
      urls: string | string[],
      options?: { cachePolicy?: string; headers?: Record<string, string> },
    ]
  >;
  clearDiskCache: jest.Mock<Promise<void>, []>;
  clearMemoryCache: jest.Mock<Promise<void>, []>;
  getCachePathAsync: jest.Mock<Promise<string>, [url: string]>;
  generateBlurhashAsync: jest.Mock<
    Promise<string>,
    [url: string, numberOfComponents?: [number, number]]
  >;
}

// Add static methods with proper typing
(Image as ImageWithStatics).prefetch = jest.fn(
  (
    _urls: string | string[],
    _options?: { cachePolicy?: string; headers?: Record<string, string> },
  ): Promise<boolean> => Promise.resolve(true),
);

(Image as ImageWithStatics).clearDiskCache = jest.fn(
  (): Promise<void> => Promise.resolve(),
);

(Image as ImageWithStatics).clearMemoryCache = jest.fn(
  (): Promise<void> => Promise.resolve(),
);

(Image as ImageWithStatics).getCachePathAsync = jest.fn(
  (_url: string): Promise<string> => Promise.resolve(`/cache/${_url}`),
);

(Image as ImageWithStatics).generateBlurhashAsync = jest.fn(
  (_url: string, _numberOfComponents?: [number, number]): Promise<string> =>
    Promise.resolve('LEHV6nWB2yk8pyo0adR*.7kCMdnj'),
);

// Export constants with const assertions for better type inference
export const ImageContentFit = {
  contain: 'contain',
  cover: 'cover',
  fill: 'fill',
  none: 'none',
  'scale-down': 'scale-down',
} as const;

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
} as const;

export const ImageTransition = {
  none: 0,
  crossDissolve: 1,
  flip: 2,
} as const;

export const ImageCachePolicy = {
  none: 'none',
  disk: 'disk',
  memory: 'memory',
  'memory-disk': 'memory-disk',
} as const;

export const ImagePriority = {
  low: 'low',
  normal: 'normal',
  high: 'high',
} as const;

// Export types for use in tests
export type ImageContentFitValue = keyof typeof ImageContentFit;
export type ImageContentPositionValue = keyof typeof ImageContentPosition;
export type ImageCachePolicyValue = keyof typeof ImageCachePolicy;
export type ImagePriorityValue = keyof typeof ImagePriority;

// Export default
export default {
  Image,
  ImageContentFit,
  ImageContentPosition,
  ImageTransition,
  ImageCachePolicy,
  ImagePriority,
};
