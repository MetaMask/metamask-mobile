///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import React, { useMemo, useState } from 'react';
import { ImageStyle, StyleProp, View } from 'react-native';
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
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const uri = useMemo(
    () => `data:image/svg+xml;utf8,${encodeURIComponent(value)}`,
    [value],
  );

  return (
    <View
      style={[
        // eslint-disable-next-line react-native/no-inline-styles
        {
          borderRadius:
            borderRadius === 100
              ? Math.min(dimensions.width, dimensions.height) / 2
              : borderRadius,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
          width: width ?? dimensions?.width,
          height: height ?? dimensions?.height
        },
        style,
      ]}
    >
      <SvgUri
        testID="snaps-ui-image"
        uri={uri}
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
    </View>
  );
};
///: END:ONLY_INCLUDE_IF
