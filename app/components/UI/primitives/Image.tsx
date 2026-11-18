import React from 'react';
import {
  Image as ExpoImage,
  type ImageProps as ExpoImageProps,
} from 'expo-image';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

interface Props extends ExpoImageProps {
  className?: string;
}

export function Image({ className, style, ...rest }: Props) {
  const tw = useTailwind();

  return (
    <ExpoImage
      {...rest}
      style={className ? [tw.style(className), style] : style}
    />
  );
}
