import React, { useEffect, useRef } from 'react';

import {
  exitContextualSection,
  getContextualNavState,
  type TradingHubTab,
} from './contextualSection';

export interface TradeFeatureRootProps {
  hub: TradingHubTab;
  children: React.ReactNode;
}

/**
 * Swap, Perps, or Predictions. The footer host draws the trade pill, so this
 * screen does not mount another one. Leaving the hub clears the section
 * unless another hub already took over.
 */
const TradeFeatureRoot = ({ hub, children }: TradeFeatureRootProps) => {
  const hubRef = useRef(hub);
  hubRef.current = hub;

  useEffect(
    () => () => {
      const current = getContextualNavState();
      if (current.section === 'trading' && current.tab === hubRef.current) {
        exitContextualSection();
      }
    },
    [],
  );

  return <>{children}</>;
};

export default TradeFeatureRoot;
