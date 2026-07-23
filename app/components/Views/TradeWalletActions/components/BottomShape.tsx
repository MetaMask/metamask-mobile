import React, { useMemo } from 'react';
import Svg, { Path, type PathProps } from 'react-native-svg';

function BottomShape({
  width,
  height,
  peakHeight = 16,
  peakBezierLength = 25,
  baseBezierLength = 55,
  fill = 'black',
  strokeOnly = false,
  pathProps,
  ...svgProps
}: {
  width: number;
  height: number;
  peakHeight?: number;
  peakBezierLength?: number;
  baseBezierLength?: number;
  fill?: string;
  strokeOnly?: boolean;
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

    // strokeOnly traces ONLY the center cutout curve. Flat shoulders are rendered
    // by the side containers' native borderBottomWidth.
    if (strokeOnly) {
      return `
        M ${rightBaseX} ${rightBaseY}
        C ${rightBaseX - peakBezierLength} ${rightBaseY}
          ${peakX + peakBezierLength} ${peakY}
          ${peakX} ${peakY}
        S ${leftBaseX + peakBezierLength} ${leftBaseY}
          ${leftBaseX} ${leftBaseY}
        H ${leftBaseX}
      `
        .replace(/\s+/g, ' ')
        .trim();
    }

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
  }, [
    width,
    height,
    peakHeight,
    peakBezierLength,
    baseBezierLength,
    strokeOnly,
  ]);

  return (
    <Svg width={width} height={height} {...svgProps}>
      <Path d={pathData} fill={strokeOnly ? 'none' : fill} {...pathProps} />
    </Svg>
  );
}

export default BottomShape;
