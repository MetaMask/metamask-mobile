///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import React, { useMemo } from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

export interface SnapUIImageProps {
  value: string;
  style?: StyleProp<ImageStyle>;
  width?: number;
  height?: number;
}

export const SnapUIImage: React.FC<SnapUIImageProps> = ({
  value,
  width,
  height,
  style,
}) => {
  const src = useMemo(() => ({ uri: `data:image/svg+xml;utf8,${encodeURIComponent(value)}` }), [value]);

  return (
    <Image
      testID="snaps-ui-image"
      source={src}
      style={[{ width, height }, style]}
    />
  );
};
///: END:ONLY_INCLUDE_IF
