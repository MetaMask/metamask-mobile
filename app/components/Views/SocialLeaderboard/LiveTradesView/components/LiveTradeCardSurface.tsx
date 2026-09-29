import React from 'react';
import LinearGradient from 'react-native-linear-gradient';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
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
 */
const LiveTradeCardSurface: React.FC<LiveTradeCardSurfaceProps> = ({
  children,
  testID = LiveTradeCardSurfaceSelectorsIDs.SURFACE,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();

  return (
    <LinearGradient
      colors={[colors.background.section, colors.background.alternative]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0.3 }}
      style={tw.style('rounded-2xl overflow-hidden p-3')}
      testID={testID}
    >
      {children}
    </LinearGradient>
  );
};

export default LiveTradeCardSurface;
