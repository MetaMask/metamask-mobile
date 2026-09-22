import React, { useCallback, useState } from 'react';
import type { LayoutChangeEvent, ColorValue } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box, BoxAlignItems } from '@metamask/design-system-react-native';

const UNDERLINE_HEIGHT = 2;
const UNDERLINE_STROKE_WIDTH = 1.5;
const UNDERLINE_START_INSET = 1;
const UNDERLINE_GAP = -1;

export interface DottedUnderlineProps {
  children: React.ReactNode;
  color: ColorValue;
  testID?: string;
  twClassName?: string;
}

const DottedUnderline = ({
  children,
  color,
  testID,
  twClassName,
}: DottedUnderlineProps) => {
  const tw = useTailwind();
  const [contentWidth, setContentWidth] = useState(0);

  const handleContentLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    setContentWidth((currentWidth) =>
      currentWidth === nextWidth ? currentWidth : nextWidth,
    );
  }, []);

  return (
    <Box
      alignItems={BoxAlignItems.Start}
      twClassName={`relative${twClassName ? ` ${twClassName}` : ''}`}
      onLayout={handleContentLayout}
      testID={testID}
    >
      {children}
      {contentWidth > 0 ? (
        <Svg
          width={contentWidth}
          height={UNDERLINE_HEIGHT}
          style={tw.style('absolute left-0', `bottom-[${UNDERLINE_GAP}px]`)}
          testID={testID ? `${testID}-underline` : undefined}
        >
          <Line
            x1={UNDERLINE_STROKE_WIDTH / 2 + UNDERLINE_START_INSET}
            y1={UNDERLINE_HEIGHT / 2}
            x2={contentWidth - UNDERLINE_STROKE_WIDTH / 2}
            y2={UNDERLINE_HEIGHT / 2}
            stroke={color}
            strokeWidth={UNDERLINE_STROKE_WIDTH}
            strokeDasharray="0, 3"
            strokeLinecap="round"
          />
        </Svg>
      ) : null}
    </Box>
  );
};

export default DottedUnderline;
