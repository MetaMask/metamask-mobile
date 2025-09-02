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

function parseSvg(svg: string) {
  const viewBoxMatch = svg.match(/viewBox="([^"]+)"/);
  const widthMatch = svg.match(/width="([^"]+)"/);
  const heightMatch = svg.match(/height="([^"]+)"/);

  const viewBox = viewBoxMatch?.[1];
  const width = widthMatch?.[1];
  const height = heightMatch?.[1];

  if (viewBox && width && height) {
    return { viewBox, height, width };
  }

  if (viewBox) {
    const viewBoxElements = viewBox.split(' ');
    return { viewBox, width: viewBoxElements[2], height: viewBoxElements[3] };
  }

  if (width && height) {
    return { viewBox: `0 0 ${width} ${height}`, width, height };
  }

  return null;
}

function getDimensions(svg: string) {
  const result = parseSvg(svg);

  if (!result) {
    return null;
  }

  const { viewBox, height, width } = result;

  if (!height || !width) {
    return { viewBox };
  }

  const parsedWidth = parseInt(width, 10);
  const parsedHeight = parseInt(height, 10);

  const aspectRatio = parsedWidth / parsedHeight;

  if (!Number.isFinite(aspectRatio)) {
    return { viewBox };
  }

  return { viewBox, aspectRatio, height: parsedHeight, width: parsedWidth };
}

export const SnapUIImage: React.FC<SnapUIImageProps> = ({
  value,
  width: propWidth,
  height: propHeight,
  style,
  borderRadius,
}) => {
  const dimensions = getDimensions(value);
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
      ] as any}
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
        viewBox={dimensions?.viewBox}
      />
    </View>
  );
};
///: END:ONLY_INCLUDE_IF
