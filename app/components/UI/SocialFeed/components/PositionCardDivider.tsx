import { Box } from '@metamask/design-system-react-native';
import React from 'react';
import Svg, { Line } from 'react-native-svg';
import { useTheme } from '../../../../util/theme';
import { POSITION_CARD_BLEED_TW_CLASS } from './PositionCardShell';

/** The design draws the rule as a 1px line. */
const DIVIDER_HEIGHT = 1;

/** 2px on, 4px off -- the perforation the cards are drawn to. */
const DASH_PATTERN = '2,4';

export interface PositionCardDividerProps {
  testID?: string;
}

/**
 * The rule between a card's header and its stats: dashed, and bled out to the
 * card's borders so it reads as a perforation across the whole card.
 *
 * The rule takes no layout height. The design hangs a 1px line in the gap
 * between the header and the stats, so each side keeps its full 8px gap. The
 * box is pulled up by its own height to match.
 *
 * Drawn in SVG rather than with `borderStyle: 'dashed'`, which React Native
 * renders inconsistently across platforms, or a row of dash views, which would
 * cost one native view per dash on every card in the feed. The line spans the
 * box as a percentage, so a card mounts without a measure-then-redraw commit.
 */
const PositionCardDivider: React.FC<PositionCardDividerProps> = ({
  testID,
}) => {
  const { colors } = useTheme();

  return (
    <Box
      twClassName={`${POSITION_CARD_BLEED_TW_CLASS} -mt-px h-px`}
      testID={testID}
    >
      <Svg width="100%" height={DIVIDER_HEIGHT}>
        <Line
          x1={0}
          y1={DIVIDER_HEIGHT / 2}
          x2="100%"
          y2={DIVIDER_HEIGHT / 2}
          stroke={colors.border.muted}
          strokeWidth={DIVIDER_HEIGHT}
          strokeDasharray={DASH_PATTERN}
        />
      </Svg>
    </Box>
  );
};

export default PositionCardDivider;
