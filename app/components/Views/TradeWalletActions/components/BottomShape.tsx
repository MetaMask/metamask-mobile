import React, { useMemo } from 'react';
import Svg, { Path } from 'react-native-svg';

export interface BottomShapeDimensions {
  width: number;
  height: number;
  peakHeight: number;
  peakBezierLength: number;
  baseBezierLength: number;
}

function getBottomShapePoints({
  width,
  height,
  peakHeight,
  baseBezierLength,
}: BottomShapeDimensions) {
  const centerX = width / 2;
  const peakX = centerX;
  const peakY = height - peakHeight;
  const leftBaseX = centerX - baseBezierLength;
  const leftBaseY = height;
  const rightBaseX = centerX + baseBezierLength;
  const rightBaseY = height;

  return {
    centerX,
    peakX,
    peakY,
    leftBaseX,
    leftBaseY,
    rightBaseX,
    rightBaseY,
  };
}

export function buildBottomShapeMaskPath(
  dimensions: BottomShapeDimensions,
): string {
  const { width, height, peakBezierLength } = dimensions;
  const { peakX, peakY, leftBaseX, leftBaseY, rightBaseX, rightBaseY } =
    getBottomShapePoints(dimensions);

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
}

export function buildBottomCutoutCurvePath(
  dimensions: BottomShapeDimensions,
): string {
  const { peakBezierLength } = dimensions;
  const { peakX, peakY, leftBaseX, leftBaseY, rightBaseX, rightBaseY } =
    getBottomShapePoints(dimensions);

  return `
      M ${rightBaseX} ${rightBaseY}
      C ${rightBaseX - peakBezierLength} ${rightBaseY}
        ${peakX + peakBezierLength} ${peakY}
        ${peakX} ${peakY}
      S ${leftBaseX + peakBezierLength} ${leftBaseY}
        ${leftBaseX} ${leftBaseY}
    `
    .replace(/\s+/g, ' ')
    .trim();
}

function BottomShape({
  width,
  height,
  peakHeight,
  peakBezierLength,
  baseBezierLength,
  fill,
  stroke,
  strokeWidth,
  ...svgProps
}: BottomShapeDimensions & {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}) {
  const isStrokeOnly = stroke != null && fill == null;

  const pathData = useMemo(() => {
    const shapeDimensions = {
      width,
      height,
      peakHeight,
      peakBezierLength,
      baseBezierLength,
    };

    if (isStrokeOnly) {
      return buildBottomCutoutCurvePath(shapeDimensions);
    }

    return buildBottomShapeMaskPath(shapeDimensions);
  }, [
    isStrokeOnly,
    width,
    height,
    peakHeight,
    peakBezierLength,
    baseBezierLength,
  ]);

  return (
    <Svg width={width} height={height} {...svgProps}>
      <Path
        d={pathData}
        fill={isStrokeOnly ? 'none' : fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
}

export default BottomShape;
