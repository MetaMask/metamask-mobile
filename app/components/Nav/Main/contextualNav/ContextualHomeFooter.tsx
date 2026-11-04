import React from 'react';

import { useFooterHostActive } from './footerHostState';
import ContextualFooter from './ContextualFooter';

export interface ContextualHomeFooterProps {
  state: {
    index: number;
    routes: { name: string }[];
  };
  /** Accepted so the tab navigator can pass its bar props through. */
  descriptors?: unknown;
  navigation?: unknown;
  onHeightChange?: (height: number) => void;
}

/**
 * JS tab bar slot. When the root host is mounted it owns the pill, so this
 * returns null and the same pill can survive a push onto Swap or Collectibles.
 */
const ContextualHomeFooter = ({
  state,
  onHeightChange,
}: ContextualHomeFooterProps) => {
  const hostActive = useFooterHostActive();
  if (hostActive) {
    return null;
  }
  const homeRouteName = state.routes[state.index]?.name;
  return (
    <ContextualFooter
      homeRouteName={homeRouteName}
      rootRouteName="Home"
      onHeightChange={onHeightChange}
    />
  );
};

export default ContextualHomeFooter;
