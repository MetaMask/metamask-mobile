import React, { useMemo } from 'react';
import Svg, { Path, type PathProps } from 'react-native-svg';

const DEFAULT_PEAK_HEIGHT = 16;
const DEFAULT_PEAK_BEZIER_LENGTH = 25;
const DEFAULT_BASE_BEZIER_LENGTH = 55;
const DEFAULT_FILL = 'black';

function BottomShape({
  width,
  height,
  peakHeight = DEFAULT_PEAK_HEIGHT,
  peakBezierLength = DEFAULT_PEAK_BEZIER_LENGTH,
  baseBezierLength = DEFAULT_BASE_BEZIER_LENGTH,
  fill = DEFAULT_FILL,
  pathProps,
  ...svgProps
}: {
  width: number;
  height: number;
  peakHeight?: number;
  peakBezierLength?: number;
  baseBezierLength?: number;
  fill?: string;
  pathProps?: PathProps;
}) {
  const pathData = useMemo(() => {
    const centerX = width / 2;

    const peakX = centerX;
    const peakY = height - peakHeight;

    const leftBaseX = centerX - baseBezierLength;
    const leftBaseY = height;
    const rightBaseX = centerX + baseBezierLength;
    const rightBaseY = height;

    return `
      M 0 ${height}
      V 0
      H ${width}
      V ${height}
      H ${rightBaseX}
      C ${rightBaseX - peakBezierLength} ${rightBaseY}
        ${peakX + peakBezierLength} ${peakY}
        ${peakX} ${peakY}
      S ${leftBaseX + peakBezierLength} ${leftBaseY}
        ${leftBaseX} ${leftBaseY}
      H 0
      Z
    `
      .replace(/\s+/g, ' ')
      .trim();
  }, [width, height, peakHeight, peakBezierLength, baseBezierLength]);

  return (
    <Svg width={width} height={height} {...svgProps}>
      <Path d={pathData} fill={fill} {...pathProps} />
    </Svg>
  );
}

export default BottomShape;
