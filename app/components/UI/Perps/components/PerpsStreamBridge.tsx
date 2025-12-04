import React from 'react';
import { usePerpsWithdrawStatus } from '../hooks/usePerpsWithdrawStatus';
import { usePerpsDepositStatus } from '../hooks/usePerpsDepositStatus';

/**
 * PerpsStreamBridge - Bridges stream context to global hooks.
 *
 * This component acts as a bridge, allowing hooks to access the PerpsStream context
 * by being rendered inside both PerpsConnectionProvider and PerpsStreamProvider.
 */
const PerpsStreamBridge: React.FC = () => {
  // Enable withdrawal status monitoring and toasts
  usePerpsWithdrawStatus();

  // Enable deposit status monitoring and toasts
  usePerpsDepositStatus();

  // This component doesn't render anything
  return null;
};

export default PerpsStreamBridge;
