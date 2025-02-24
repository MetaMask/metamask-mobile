///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import React, { useMemo } from 'react';
import { ImageStyle, StyleProp } from 'react-native';
import { SvgUri } from 'react-native-svg';

export interface SnapUIImageProps {
  value: string;
  style?: StyleProp<ImageStyle>;
  width?: number;
  height?: number;
  borderRadius?: number;
}

export const SnapUIImage: React.FC<SnapUIImageProps> = ({
  value,
  width,
  height,
  style,
  borderRadius,
}) => {
  const uri = useMemo(
    () => `data:image/svg+xml;utf8,${encodeURIComponent(value)}`,
    [value],
  );

  return (
    <SvgUri
      testID="snaps-ui-image"
      uri={uri}
      style={[{ width, height, borderRadius }, style]}
    />
  );
};
///: END:ONLY_INCLUDE_IF
