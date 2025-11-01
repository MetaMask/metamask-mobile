import React from 'react';
import { Svg, Path } from 'react-native-svg';

function OverlayWithHole({
  width,
  height,
  circleSize,
  circleX,
  circleY,
}: {
  width: number;
  height: number;
  circleSize: number;
  circleX: number;
  circleY: number;
}) {
  const radius = circleSize / 2;

  const pathData = `
    M 0 0
    L ${width} 0
    L ${width} ${height}
    L 0 ${height}
    L 0 0
    Z
    M ${circleX - radius} ${circleY}
    A ${radius} ${radius} 0 1 1 ${circleX + radius} ${circleY}
    A ${radius} ${radius} 0 1 1 ${circleX - radius} ${circleY}
    Z
  `;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Path d={pathData} fill="black" fillRule="evenodd" />
    </Svg>
  );
}

export default OverlayWithHole;
