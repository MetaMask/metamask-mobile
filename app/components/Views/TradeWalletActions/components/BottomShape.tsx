import React, { useMemo } from 'react';
import Svg, { Path } from 'react-native-svg';

function BottomShape({
  width,
  height,
  peakHeight,
  peakBezierLength,
  baseBezierLength,
  fill,
  ...svgProps
}: {
  width: number;
  height: number;
  peakHeight: number;
  peakBezierLength: number;
  baseBezierLength: number;
  fill: string;
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
      <Path d={pathData} fill={fill} />
    </Svg>
  );
}

export default BottomShape;
