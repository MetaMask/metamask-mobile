import { useSelector } from 'react-redux';
import { useCallback, useMemo } from 'react';
import Engine from '../../../../core/Engine';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import {
  selectIsWalletBlocked,
  selectAreAnyWalletsBlocked,
} from '../../../../selectors/complianceController';
import { selectComplianceEnabled } from '../../../../selectors/featureFlagController/compliance';
import { useAccessRestrictedModal } from '../contexts/AccessRestrictedContext';

type ComplianceResult =
  | { blocked: boolean }
  | { blocked: boolean }[]
  | undefined
  | null;

type AddressInput = string | string[];

function normalizeAddresses(input: AddressInput): string[] {
  return Array.isArray(input) ? input : [input];
}

/**
 * Hook that provides compliance state and actions for one or more wallet addresses.
 *
 * Reads from the cached blocklist (synchronous) and exposes an imperative
 * `checkCompliance` function for on-demand API checks.
 *
 * When given an array of addresses (e.g. from a multichain account group),
 * `isBlocked` returns `true` if ANY address in the array is blocked.
 *
 * @param address - A single wallet address or array of addresses to check.
 * @returns Object with `isBlocked` boolean and `checkCompliance` async function.
 *
 * @example
 * ```tsx
 * // Single address
 * const { isBlocked } = useWalletCompliance(recipientAddress);
 *
 * // Multiple addresses (multichain account group)
 * const { isBlocked } = useWalletCompliance(['0xEVM...', 'bc1q...', 'So1...']);
 * ```
 */
export function useWalletCompliance(address?: AddressInput) {
  if (!address) {
    return { isBlocked: false, checkCompliance: async () => undefined };
  }
  const addressKey = Array.isArray(address) ? address.join(',') : address;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- addressKey is a stable scalar derived from address
  const addresses = useMemo(() => normalizeAddresses(address), [addressKey]);
  const isSingle = addresses.length === 1;

  const singleBlocked = useSelector(selectIsWalletBlocked(addresses[0] ?? ''));
  const batchBlocked = useSelector(
    selectAreAnyWalletsBlocked(isSingle ? [] : addresses),
  );

  const isBlocked = isSingle ? singleBlocked : batchBlocked;

  const checkCompliance = useCallback(async () => {
    if (isSingle) {
      return Engine.context.ComplianceController.checkWalletCompliance(
        addresses[0],
      );
    }
    return Engine.context.ComplianceController.checkWalletsCompliance(
      addresses,
    );
  }, [addresses, isSingle]);

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
 * @param address - A single wallet address or array of addresses to check.
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
export function useComplianceGate(address?: AddressInput) {
  const isComplianceEnabled = useSelector(selectComplianceEnabled);
  const { isBlocked: rawIsBlocked, checkCompliance } =
    useWalletCompliance(address);
  const { showAccessRestrictedModal } = useAccessRestrictedModal();

  const isBlocked = isComplianceEnabled && rawIsBlocked;

  const gate = useCallback(
    async <T>(action: () => Promise<T>): Promise<T | void> => {
      if (!isComplianceEnabled) {
        DevLogger.log(
          '[useComplianceGate] Compliance disabled, skipping check',
        );
        return action();
      }

      let blocked = false;

      try {
        DevLogger.log('[useComplianceGate] Running compliance check');

        const result = (await checkCompliance()) as ComplianceResult;
        blocked = Array.isArray(result)
          ? result.some((r) => r.blocked)
          : (result?.blocked ?? false);

        DevLogger.log('[useComplianceGate] Check complete', {
          blocked,
          result,
        });
      } catch (error) {
        DevLogger.log('[useComplianceGate] Error checking compliance', error);
        return action();
      }

      if (blocked) {
        DevLogger.log('[useComplianceGate] Wallet blocked, showing modal');
        showAccessRestrictedModal();
        return;
      }

      DevLogger.log('[useComplianceGate] Wallet not blocked, proceeding');
      return action();
    },
    [isComplianceEnabled, checkCompliance, showAccessRestrictedModal],
  );

  return useMemo(
    () => ({ isComplianceEnabled, isBlocked, checkCompliance, gate }),
    [isComplianceEnabled, isBlocked, checkCompliance, gate],
  );
}
