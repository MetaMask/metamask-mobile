import React from 'react';
import { useMusdConversionStatus } from '../hooks/useMusdConversionStatus';

/**
 * EarnTransactionMonitor - Mounts global transaction monitoring hooks for Earn features.
 *
 * This component acts as a mount point for persistent transaction monitoring hooks,
 * allowing them to remain active even when navigating away from Earn screens.
 * It's mounted globally in the Main component to ensure consistent toast notifications.
 */
const EarnTransactionMonitor: React.FC = () => {
  // Enable mUSD conversion status monitoring and toasts
  useMusdConversionStatus();

  // This component doesn't render anything
  return null;
};

export default EarnTransactionMonitor;
