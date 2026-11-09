import React from 'react';
import Svg, { Rect } from 'react-native-svg';
import { useTheme } from '../../../../../../util/theme';

const BAR_Y = [2.5, 12.5, 22.5] as const;

const GLYPH_WIDTH = 28;
const GLYPH_HEIGHT = 32;

/**
 * Order-form half of the layout picker thumbnail — stacked input rows. Matches
 * the Extension thumbnail geometry.
 *
 * Decorative: the enclosing option chip carries the accessible name, so this
 * stays out of the a11y tree even if the rows ever gain labels.
 */
const PerpsProOrderFormGlyph = () => {
  const { colors } = useTheme();

  return (
    <Svg
      width={GLYPH_WIDTH}
      height={GLYPH_HEIGHT}
      fill="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {BAR_Y.map((y) => (
        <Rect
          key={y}
          x={0}
          y={y}
          width={GLYPH_WIDTH}
          height={7}
          rx={2}
          fill={colors.icon.alternative}
        />
      ))}
    </Svg>
  );
};

export default PerpsProOrderFormGlyph;
