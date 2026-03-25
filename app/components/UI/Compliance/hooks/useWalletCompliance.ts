import { useSelector } from 'react-redux';
import { useCallback, useEffect, useMemo } from 'react';
import Engine from '../../../../core/Engine';
import {
  selectIsWalletBlocked,
  selectAreAnyWalletsBlocked,
} from '../../../../selectors/complianceController';
import { selectComplianceEnabled } from '../../../../selectors/featureFlagController/compliance';
import { selectSelectedAccountGroupWithInternalAccountsAddresses } from '../../../../selectors/multichainAccounts/accountTreeController';
import { useAccessRestrictedModal } from '../contexts/AccessRestrictedContext';

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
export function useWalletCompliance(address: AddressInput) {
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
export function useComplianceGate(address: AddressInput) {
  const isComplianceEnabled = useSelector(selectComplianceEnabled);
  const { isBlocked: rawIsBlocked, checkCompliance } =
    useWalletCompliance(address);

  const isBlocked = isComplianceEnabled && rawIsBlocked;

  return useMemo(
    () => ({ isComplianceEnabled, isBlocked, checkCompliance }),
    [isComplianceEnabled, isBlocked, checkCompliance],
  );
}

/**
 * Zero-config hook that checks compliance for all addresses in the
 * currently selected account group. In multichain wallets, one group
 * can contain EVM, Solana, Bitcoin, and other chain-specific addresses.
 *
 * Returns `isBlocked: true` if ANY address in the group is blocked.
 *
 * @returns Object with `isComplianceEnabled`, `isBlocked`, and `checkCompliance`.
 *
 * @example
 * ```tsx
 * const { isBlocked } = useAccountGroupCompliance();
 *
 * if (isBlocked) {
 *   // Current account group contains a sanctioned address
 * }
 * ```
 */
export function useAccountGroupCompliance() {
  const addresses = useSelector(
    selectSelectedAccountGroupWithInternalAccountsAddresses,
  );
  const filteredAddresses = useMemo(
    () => addresses.filter((addr): addr is string => addr != null),
    [addresses],
  );
  const complianceGate = useComplianceGate(
    filteredAddresses.length > 0 ? filteredAddresses : [],
  );

  const { showAccessRestrictedModal, hideAccessRestrictedModal } =
    useAccessRestrictedModal();

  useEffect(() => {
    if (complianceGate.isBlocked) {
      showAccessRestrictedModal();
    } else {
      hideAccessRestrictedModal();
    }
  }, [
    complianceGate.isBlocked,
    showAccessRestrictedModal,
    hideAccessRestrictedModal,
  ]);

  return complianceGate;
}
