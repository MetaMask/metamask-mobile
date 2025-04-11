///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import React from 'react';
import { ImageStyle, StyleProp, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

export interface SnapUIImageProps {
  value: string;
  style?: StyleProp<ImageStyle>;
  width?: number;
  height?: number;
  borderRadius?: number;
}

function getViewBox(svg: string) {
  const viewBoxMatch = svg.match(/viewBox="([^"]+)"/);

  if (viewBoxMatch?.[1]) {
    return viewBoxMatch?.[1];
  }

  const widthMatch = svg.match(/width="([^"]+)"/);
  const heightMatch = svg.match(/height="([^"]+)"/);

  if (widthMatch?.[1] && heightMatch?.[1]) {
    const width = widthMatch[1];
    const height = heightMatch[1];
    return `0 0 ${width} ${height}`;
  }

  return undefined;
}

function getDimensions(viewBox?: string) {
  if (!viewBox) {
    return null;
  }

  const viewBoxElements = viewBox.split(' ');
  const originalWidth = viewBoxElements[2];
  const originalHeight = viewBoxElements[3];

  if (!originalHeight || !originalWidth) {
    return null;
  }

  const parsedWidth = parseInt(originalWidth, 10);
  const parsedHeight = parseInt(originalHeight, 10);

  const aspectRatio = parsedWidth / parsedHeight;

  if (!Number.isFinite(aspectRatio)) {
    return null;
  }

  return { aspectRatio, height: parsedHeight, width: parsedWidth };
}

export const SnapUIImage: React.FC<SnapUIImageProps> = ({
  value,
  width: propWidth,
  height: propHeight,
  style,
  borderRadius,
}) => {
  const viewBox = getViewBox(value);
  const dimensions = getDimensions(viewBox);
  const aspectRatio = dimensions?.aspectRatio ?? 1;
  const width = propWidth ?? dimensions?.width;
  const height = propHeight ?? dimensions?.height;

  return (
    <View
      style={[
        // eslint-disable-next-line react-native/no-inline-styles
        {
          width,
          height,
          borderRadius,
          overflow: 'hidden',
          aspectRatio,
          maxHeight: '100%',
          maxWidth: '100%',
        },
        style,
      ]}
    >
      <SvgXml
        testID="snaps-ui-image"
        xml={value}
        // eslint-disable-next-line react-native/no-inline-styles
        style={{
          flex: 1,
        }}
        height="100%"
        width="100%"
        viewBox={viewBox}
      />
    </View>
  );
};
///: END:ONLY_INCLUDE_IF
