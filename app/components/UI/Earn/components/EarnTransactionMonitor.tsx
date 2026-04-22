import React from 'react';
import { useEnsureMusdTokenRegistered } from '../hooks/useEnsureMusdTokenRegistered';
import { useMusdConversionStatus } from '../hooks/useMusdConversionStatus';
import { useMusdConversionStaleApprovalCleanup } from '../hooks/useMusdConversionStaleApprovalCleanup';
import { useMerklClaimStatus } from '../hooks/useMerklClaimStatus';

/**
 * EarnTransactionMonitor - Mounts global transaction monitoring hooks for Earn features.
 *
 * This component acts as a mount point for persistent transaction monitoring hooks,
 * allowing them to remain active even when navigating away from Earn screens.
 */
const EarnTransactionMonitor: React.FC = () => {
  // Register mUSD token in TokensController for all supported chains
  // This is necessary for the "Max" conversion flow.
  useEnsureMusdTokenRegistered();
  /**
   * Reject stale mUSD pending approvals on app foreground.
   * For example, resuming via notification or deeplink can bypass
   * the normal confirmation rejection path.
   */
  useMusdConversionStaleApprovalCleanup();
  // Enable mUSD conversion status monitoring and toasts
  useMusdConversionStatus();
  // Enable Merkl bonus claim status monitoring and toasts
  useMerklClaimStatus();

  // This component doesn't render anything
  return null;
};

export default EarnTransactionMonitor;
