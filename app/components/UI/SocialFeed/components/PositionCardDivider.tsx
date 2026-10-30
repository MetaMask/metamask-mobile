import { Box } from '@metamask/design-system-react-native';
import React from 'react';
import Svg, { Line } from 'react-native-svg';
import { useTheme } from '../../../../util/theme';
import { POSITION_CARD_BLEED_TW_CLASS } from './PositionCardShell';

const DIVIDER_STROKE = 1;

/** 2px on, 4px off -- the perforation the cards are drawn to. */
const DASH_PATTERN = '2,4';

export interface PositionCardDividerProps {
  testID?: string;
}

/**
 * The rule between a card's header and its stats: a 1px dashed line, bled out
 * to the card's borders so it reads as a perforation across the whole card.
 *
 * Drawn in SVG rather than with `borderStyle: 'dashed'`, which React Native
 * renders inconsistently across platforms, or a row of dash views, which would
 * cost one native view per dash on every card in the feed. The line spans the
 * box as a percentage, so a card mounts without a measure-then-redraw commit.
 *
 * The rule takes no layout height. Its box is zero tall and the line hangs one
 * stroke above it, so the gaps either side of the rule set the spacing.
 */
const PositionCardDivider: React.FC<PositionCardDividerProps> = ({
  testID,
}) => {
  const { colors } = useTheme();

  return (
    <Box twClassName={`${POSITION_CARD_BLEED_TW_CLASS} h-0`} testID={testID}>
      <Svg
        width="100%"
        height={DIVIDER_STROKE}
        style={{ marginTop: -DIVIDER_STROKE }}
      >
        <Line
          x1={0}
          y1={DIVIDER_STROKE / 2}
          x2="100%"
          y2={DIVIDER_STROKE / 2}
          stroke={colors.border.muted}
          strokeWidth={DIVIDER_STROKE}
          strokeDasharray={DASH_PATTERN}
        />
      </Svg>
    </Box>
  );
};

export default PositionCardDivider;
