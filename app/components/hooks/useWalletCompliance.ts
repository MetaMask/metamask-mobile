import { useSelector } from 'react-redux';
import { useCallback, useMemo } from 'react';
import Engine from '../../core/Engine';
import { selectIsWalletBlocked } from '../../selectors/complianceController';
import { selectComplianceEnabled } from '../../selectors/featureFlagController/compliance';

/**
 * Hook that provides compliance state and actions for a wallet address.
 *
 * Reads from the cached blocklist (synchronous) and exposes an imperative
 * `checkCompliance` function for on-demand API checks.
 *
 * @param address - The wallet address to check.
 * @returns Object with `isBlocked` boolean and `checkCompliance` async function.
 *
 * @example
 * ```tsx
 * const { isBlocked, checkCompliance } = useWalletCompliance(recipientAddress);
 *
 * if (isBlocked) {
 *   // Show blocked wallet UI
 * }
 * ```
 */
export function useWalletCompliance(address: string) {
  const isBlocked = useSelector(selectIsWalletBlocked(address));

  const checkCompliance = useCallback(
    async () =>
      Engine.context.ComplianceController.checkWalletCompliance(address),
    [address],
  );

  return useMemo(
    () => ({ isBlocked, checkCompliance }),
    [isBlocked, checkCompliance],
  );
}

/**
 * Convenience hook that combines the compliance feature flag check with
 * the wallet blocked status. Use this as a guard in transaction flows.
 *
 * When compliance is disabled via feature flag, `isBlocked` always returns
 * `false` regardless of the cached blocklist.
 *
 * @param address - The wallet address to check.
 * @returns Object with `isComplianceEnabled`, `isBlocked`, and `checkCompliance`.
 *
 * @example
 * ```tsx
 * const { isComplianceEnabled, isBlocked } = useComplianceGate(recipientAddress);
 *
 * if (isComplianceEnabled && isBlocked) {
 *   // Block the transaction
 * }
 * ```
 */
export function useComplianceGate(address: string) {
  const isComplianceEnabled = useSelector(selectComplianceEnabled);
  const { isBlocked: rawIsBlocked, checkCompliance } =
    useWalletCompliance(address);

  const isBlocked = isComplianceEnabled && rawIsBlocked;

  return useMemo(
    () => ({ isComplianceEnabled, isBlocked, checkCompliance }),
    [isComplianceEnabled, isBlocked, checkCompliance],
  );
}
