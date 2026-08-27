import React from 'react';
import Svg, { Rect } from 'react-native-svg';
import { useTheme } from '../../../../../../util/theme';

/** Bar widths, ask side (red) first then bid side (green), top to bottom. */
const BAR_WIDTHS = [28, 18, 12, 12, 18, 28] as const;
const BAR_Y = [2.5, 7.5, 12.5, 17.5, 22.5, 27.5] as const;
const ASK_BAR_COUNT = 3;

const GLYPH_WIDTH = 28;
const GLYPH_HEIGHT = 32;

export interface PerpsProOrderBookGlyphProps {
  /**
   * Edge the bars sit flush against, mirroring the real ladder: bars grow
   * rightwards when the column is pinned left, and leftwards when pinned right.
   */
  align: 'left' | 'right';
}

/**
 * Order-book half of the layout picker thumbnail — stacked depth bars, asks
 * above bids. Matches the Extension thumbnail geometry.
 *
 * Decorative: the enclosing option chip carries the accessible name, so this
 * stays out of the a11y tree even if the bars ever gain labels.
 */
const PerpsProOrderBookGlyph = ({ align }: PerpsProOrderBookGlyphProps) => {
  const { colors } = useTheme();

  return (
    <Svg
      width={GLYPH_WIDTH}
      height={GLYPH_HEIGHT}
      fill="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {BAR_WIDTHS.map((width, index) => (
        <Rect
          key={BAR_Y[index]}
          x={align === 'left' ? 0 : GLYPH_WIDTH - width}
          y={BAR_Y[index]}
          width={width}
          height={2}
          rx={1}
          fill={
            index < ASK_BAR_COUNT
              ? colors.error.default
              : colors.success.default
          }
        />
      ))}
    </Svg>
  );
};

export default PerpsProOrderBookGlyph;
