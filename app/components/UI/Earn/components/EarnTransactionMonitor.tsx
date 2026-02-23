import React from 'react';
import { useMusdConversionStatus } from '../hooks/useMusdConversionStatus';
import { useMerklClaimStatus } from '../hooks/useMerklClaimStatus';

/**
 * EarnTransactionMonitor - Mounts global transaction monitoring hooks for Earn features.
 *
 * This component acts as a mount point for persistent transaction monitoring hooks,
 * allowing them to remain active even when navigating away from Earn screens.
 */
const EarnTransactionMonitor: React.FC = () => {
  // Enable mUSD conversion status monitoring and toasts
  useMusdConversionStatus();
  // Enable Merkl bonus claim status monitoring and toasts
  useMerklClaimStatus();

  // This component doesn't render anything
  return null;
};

export default EarnTransactionMonitor;
