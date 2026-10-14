import React from 'react';
import SocialGradientCardSurface from '../../components/SocialGradientCardSurface';
import { LiveTradeCardSurfaceSelectorsIDs } from './LiveTradeCardSurface.testIds';

export interface LiveTradeCardSurfaceProps {
  children: React.ReactNode;
  testID?: string;
}

/**
 * Compact Live trades card chrome: shared muted gradient + hairline, with
 * inner padding for the trade rows. Isolated so Live trades callers keep a
 * stable import.
 */
const LiveTradeCardSurface: React.FC<LiveTradeCardSurfaceProps> = ({
  children,
  testID = LiveTradeCardSurfaceSelectorsIDs.SURFACE,
}) => (
  <SocialGradientCardSurface
    testID={testID}
    gradientTestID={LiveTradeCardSurfaceSelectorsIDs.GRADIENT}
    twClassName="p-3"
  >
    {children}
  </SocialGradientCardSurface>
);

export default LiveTradeCardSurface;
