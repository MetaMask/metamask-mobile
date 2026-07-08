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

    // strokeOnly builds an open path for the border-muted stroke that traces the full
    // bottom edge of the trade-menu shape: the flat shoulders on either side plus the
    // cutout curve in the middle, so the border wraps continuously across the bottom.
    // TradeWalletActions is the only caller; this branch can be removed if that menu no longer has a border.
    if (strokeOnly) {
      return `
        M ${width} ${height}
        H ${rightBaseX}
        C ${rightBaseX - peakBezierLength} ${rightBaseY}
          ${peakX + peakBezierLength} ${peakY}
          ${peakX} ${peakY}
        S ${leftBaseX + peakBezierLength} ${leftBaseY}
          ${leftBaseX} ${leftBaseY}
        H 0
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
