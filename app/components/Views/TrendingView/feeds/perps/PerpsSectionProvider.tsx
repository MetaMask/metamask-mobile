import React, { type PropsWithChildren } from 'react';
import { PerpsConnectionProvider } from '../../../../UI/Perps/providers/PerpsConnectionProvider';
import { PerpsStreamProvider } from '../../../../UI/Perps/providers/PerpsStreamManager';

/**
 * Wraps any subtree that consumes the perps feed. Required because
 * `usePerpsMarkets` reads from the perps connection + stream contexts.
 */
const PerpsSectionProvider: React.FC<PropsWithChildren> = ({ children }) => (
  <PerpsConnectionProvider suppressErrorView>
    <PerpsStreamProvider>{children}</PerpsStreamProvider>
  </PerpsConnectionProvider>
);

export default PerpsSectionProvider;
