import React, { createContext } from 'react';

import { FeatureId } from '@metamask/bridge-controller';

export const FeatureIdContext = createContext<FeatureId | null>(null);

export function FeatureIdProvider({
  children,
  featureId,
}: {
  children: React.ReactNode;
  featureId: FeatureId;
}) {
  return (
    <FeatureIdContext.Provider value={featureId}>
      {children}
    </FeatureIdContext.Provider>
  );
}
