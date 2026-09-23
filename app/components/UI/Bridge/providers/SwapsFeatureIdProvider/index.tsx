import React, { createContext, useContext } from 'react';
import type { FeatureId } from '@metamask/bridge-controller';

export const SwapsFeatureIdContext = createContext<FeatureId | null>(null);

interface SwapsFeatureIdProviderProps {
  children: React.ReactNode;
  featureId: FeatureId;
}

/**
 * Scopes a subtree to the flow rendering it, so shared components below can
 * attribute their analytics without every caller threading the id down.
 *
 * The bridge stack hosts several flows at once, so this belongs around an
 * individual tab or flow rather than around the stack. Screens pushed as their
 * own route are siblings rather than children, so they take the id as a route
 * param instead of reading it here.
 */
export function SwapsFeatureIdProvider({
  children,
  featureId,
}: SwapsFeatureIdProviderProps) {
  return (
    <SwapsFeatureIdContext.Provider value={featureId}>
      {children}
    </SwapsFeatureIdContext.Provider>
  );
}
