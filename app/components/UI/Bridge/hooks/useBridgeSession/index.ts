import { useContext } from 'react';

import { BridgeSessionContext } from '../../providers/BridgeSessionProvider';

export const useBridgeSession = () => {
  const context = useContext(BridgeSessionContext);

  if (!context) {
    throw new Error(
      'useBridgeSession must be used within BridgeSessionProvider',
    );
  }

  return context;
};
