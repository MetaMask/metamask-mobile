import React from 'react';

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
 * JS tab bar. Always draws the pill. The native path uses
 * `ContextualNativeHomeChrome` inside the Home screen instead.
 */
const ContextualHomeFooter = ({
  state,
  onHeightChange,
}: ContextualHomeFooterProps) => {
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
