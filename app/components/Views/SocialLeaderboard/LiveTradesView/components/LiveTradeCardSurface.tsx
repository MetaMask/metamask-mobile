import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../../../../util/theme';
import { LiveTradeCardSurfaceSelectorsIDs } from './LiveTradeCardSurface.testIds';

export interface LiveTradeCardSurfaceProps {
  children: React.ReactNode;
  testID?: string;
}

/**
 * Compact Live trades card chrome: a left-to-right token gradient with a
 * slight downward tilt, no border. Isolated so the stops can be tuned without
 * touching row layout.
 *
 * The gradient is an absolutely filled layer behind the content rather than
 * the card's layout container, so the card is sized by its rows.
 *
 * The hairline matches `PositionCardShell`'s neutral tone. A live trade is a
 * fill, not a settled position, so it never takes that shell's success/error
 * border -- there is no realized P&L to colour.
 */
const LiveTradeCardSurface: React.FC<LiveTradeCardSurfaceProps> = ({
  children,
  testID = LiveTradeCardSurfaceSelectorsIDs.SURFACE,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();

  return (
    <Box
      twClassName="self-stretch overflow-hidden rounded-2xl border border-muted p-3"
      testID={testID}
    >
      <LinearGradient
        colors={[colors.background.section, colors.background.alternative]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.3 }}
        pointerEvents="none"
        style={tw.style('absolute inset-0')}
        testID={LiveTradeCardSurfaceSelectorsIDs.GRADIENT}
      />
      {children}
    </Box>
  );
};

export default LiveTradeCardSurface;
