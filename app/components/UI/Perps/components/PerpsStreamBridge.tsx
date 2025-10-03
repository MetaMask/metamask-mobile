import React from 'react';
import { usePerpsWithdrawStatus } from '../hooks/usePerpsWithdrawStatus';

/**
 * PerpsStreamBridge - Bridges stream context to global hooks.
 *
 * This component acts as a bridge, allowing hooks to access the PerpsStream context
 * by being rendered inside both PerpsConnectionProvider and PerpsStreamProvider.
 */
const PerpsStreamBridge: React.FC = () => {
  // Enable withdrawal status monitoring and toasts
  usePerpsWithdrawStatus();

  // This component doesn't render anything
  return null;
};

export default PerpsStreamBridge;
