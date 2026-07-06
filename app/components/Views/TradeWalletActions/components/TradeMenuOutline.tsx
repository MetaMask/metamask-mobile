import React, { useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const BORDER_RADIUS = 16;

export const TRADE_MENU_OUTLINE_TEST_ID =
  'wallet-actions-bottom-sheet-menu-outline';

export interface TradeMenuOutlineProps {
  width: number;
  height: number;
  stroke: string;
  strokeWidth?: number;
  peakHeight: number;
  peakBezierLength: number;
  baseBezierLength: number;
  style?: StyleProp<ViewStyle>;
}

export function buildTradeMenuOutlinePath({
  width,
  height,
  peakHeight,
  peakBezierLength,
  baseBezierLength,
}: Pick<
  TradeMenuOutlineProps,
  'width' | 'height' | 'peakHeight' | 'peakBezierLength' | 'baseBezierLength'
>): string {
  const radius = BORDER_RADIUS;
  const centerX = width / 2;
  const peakY = height - peakHeight;
  const leftBaseX = centerX - baseBezierLength;
  const rightBaseX = centerX + baseBezierLength;

  return [
    `M ${radius} 0`,
    `H ${width - radius}`,
    `A ${radius} ${radius} 0 0 1 ${width} ${radius}`,
    `V ${height - radius}`,
    `A ${radius} ${radius} 0 0 1 ${width - radius} ${height}`,
    `H ${rightBaseX}`,
    `C ${rightBaseX - peakBezierLength} ${height}`,
    `${centerX + peakBezierLength} ${peakY}`,
    `${centerX} ${peakY}`,
    `S ${leftBaseX + peakBezierLength} ${height}`,
    `${leftBaseX} ${height}`,
    `H ${radius}`,
    `A ${radius} ${radius} 0 0 1 0 ${height - radius}`,
    `V ${radius}`,
    `A ${radius} ${radius} 0 0 1 ${radius} 0`,
    'Z',
  ]
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function TradeMenuOutline({
  width,
  height,
  stroke,
  strokeWidth = 1,
  peakHeight,
  peakBezierLength,
  baseBezierLength,
  style,
}: TradeMenuOutlineProps) {
  const pathData = useMemo(
    () =>
      buildTradeMenuOutlinePath({
        width,
        height,
        peakHeight,
        peakBezierLength,
        baseBezierLength,
      }),
    [width, height, peakHeight, peakBezierLength, baseBezierLength],
  );

  if (width <= 0 || height <= 0) {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, style]}
      testID={TRADE_MENU_OUTLINE_TEST_ID}
    >
      <Svg width={width} height={height}>
        <Path
          d={pathData}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      </Svg>
    </View>
  );
}

export default TradeMenuOutline;
