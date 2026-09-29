import { Box } from '@metamask/design-system-react-native';
import React, { useCallback, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { useTheme } from '../../../../../../util/theme';
import { POSITION_CARD_BLEED_TW_CLASS } from './PositionCardShell';

const DIVIDER_HEIGHT = 2;

/** 2px on, 4px off -- the perforation the cards are drawn to. */
const DASH_PATTERN = `${DIVIDER_HEIGHT},4`;

export interface PositionCardDividerProps {
  testID?: string;
}

/**
 * The rule between a card's header and its stats: dashed, and bled out to the
 * card's borders so it reads as a perforation across the whole card.
 *
 * Drawn in SVG rather than with `borderStyle: 'dashed'`, which React Native
 * renders inconsistently across platforms, or a row of dash views, which would
 * cost one native view per dash on every card in the feed.
 */
const PositionCardDivider: React.FC<PositionCardDividerProps> = ({
  testID,
}) => {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    setWidth((current) => (current === next ? current : next));
  }, []);

  return (
    <Box
      twClassName={`${POSITION_CARD_BLEED_TW_CLASS} h-0.5`}
      onLayout={handleLayout}
      testID={testID}
    >
      {width > 0 ? (
        <Svg width={width} height={DIVIDER_HEIGHT}>
          <Line
            x1={0}
            y1={DIVIDER_HEIGHT / 2}
            x2={width}
            y2={DIVIDER_HEIGHT / 2}
            stroke={colors.border.muted}
            strokeWidth={DIVIDER_HEIGHT}
            strokeDasharray={DASH_PATTERN}
          />
        </Svg>
      ) : null}
    </Box>
  );
};

export default PositionCardDivider;
