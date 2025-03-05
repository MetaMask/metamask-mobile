///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import React, { useState } from 'react';
import { ImageStyle, StyleProp } from 'react-native';
import { SvgXml } from 'react-native-svg';

export interface SnapUIImageProps {
  value: string;
  style?: StyleProp<ImageStyle>;
  width?: number;
  height?: number;
  borderRadius?: number | 'full';
}

export const SnapUIImage: React.FC<SnapUIImageProps> = ({
  value,
  width,
  height,
  style,
  borderRadius,
}) => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  return (
    <SvgXml
      testID="snaps-ui-image"
      style={[
        // eslint-disable-next-line react-native/no-inline-styles
        {
          borderRadius:
            borderRadius === 'full'
              ? Math.min(dimensions.width, dimensions.height) / 2
              : borderRadius,
          overflow: 'hidden',
        },
        style,
      ]}
      xml={value}
      {...(width ? { width } : {})}
      {...(height ? { height } : {})}
      onLayout={(layoutChangeEvent) => {
        if (!dimensions.width || !dimensions.height) {
          const { width: layoutWidth, height: layoutHeight } =
            layoutChangeEvent.nativeEvent.layout;

          setDimensions({
            width: layoutWidth,
            height: layoutHeight,
          });
        }
      }}
    />
  );
};
///: END:ONLY_INCLUDE_IF
