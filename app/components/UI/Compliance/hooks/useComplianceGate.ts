import { useSelector } from 'react-redux';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isValidHexAddress } from '@metamask/controller-utils';
import Engine from '../../../../core/Engine';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { selectAreAnyWalletsBlocked } from '../../../../selectors/complianceController';
import { selectComplianceEnabled } from '../../../../selectors/featureFlagController/compliance';
import { useAccessRestrictedModal } from '../contexts/AccessRestrictedContext';

type AddressInput = string | string[];

// OFAC status for a wallet doesn't change minute-to-minute, so a recent
// result already in the query cache is trusted instead of re-checking on
// every screen mount that gates on the same address.
const COMPLIANCE_CACHE_FRESHNESS_MS = 10 * 60 * 1000;

// The global query client defaults to `retry: 2` (reasonable for most data),
// but that would make a real API outage take ~3s of backoff before gate()
// can fail open. Compliance checks should fail open immediately on error,
// matching the single-attempt behavior of a direct Engine call.
const COMPLIANCE_QUERY_OPTIONS = {
  staleTime: COMPLIANCE_CACHE_FRESHNESS_MS,
  retry: false,
} as const;

// EVM addresses are case-insensitive (checksum casing carries no meaning),
// matching how `getWalletComplianceStatus` inside `@metamask/compliance-controller`
// already treats them for the Redux-backed `isBlocked` status. Non-hex
// addresses (Solana, Bitcoin, ...) are left untouched since case is
// significant for those.
const normalizeAddressForCacheKey = (addr: string) =>
  isValidHexAddress(addr, { allowNonPrefixed: false })
    ? addr.toLowerCase()
    : addr;

// Builds the query cache key from a raw, comma-joined addressKey — collapsing
// differently-cased references to the same wallet onto the same cache entry.
const complianceQueryKey = (addressKey: string) =>
  [
    'complianceCheck',
    addressKey
      .split(',')
      .filter(Boolean)
      .map(normalizeAddressForCacheKey)
      .join(','),
  ] as const;

/**
 * Guards an async action behind an OFAC compliance check.
 *
 * On mount (and whenever `address` changes) the hook prefetches compliance
 * status in the background. When `gate(action)` is called it:
 * 1. Skips the check entirely when compliance is disabled via feature flag.
 * 2. Awaits the prefetch if it is still in-flight (race-condition guard for
 * users who tap very quickly after the screen loads).
 * 3. Abandons silently (returns `undefined`, shows nothing) if the selected
 * wallet changed while the check was in flight — the action belonged to the
 * previous wallet, so the user retries under the new one.
 * 4. Shows `AccessRestrictedModal` and returns `undefined` if any address is
 * blocked; otherwise runs the action and returns its result.
 *
 * @param address - A single wallet address or array of addresses to check.
 *
 * @example
 * ```tsx
 * const { gate } = useComplianceGate(recipientAddress);
 *
 * const handleSend = useCallback(
 *   () => gate(async () => { await send(); }),
 *   [gate],
 * );
 * ```
 */
export function useComplianceGate(address?: AddressInput) {
  // addressKey collapses the address prop to a stable scalar so that callers
  // passing an inline array literal don't cause a new memo on every render.
  const addressKey = address
    ? Array.isArray(address)
      ? address.join(',')
      : address
    : '';

  // Derive addresses from the scalar key so the memo depends only on what it
  // uses — no eslint-disable needed.
  const addresses = useMemo(
    () => (addressKey ? addressKey.split(',').filter(Boolean) : []),
    [addressKey],
  );

  const isComplianceEnabled = useSelector(selectComplianceEnabled);
  const rawIsBlocked = useSelector(selectAreAnyWalletsBlocked(addresses));
  const { showAccessRestrictedModal } = useAccessRestrictedModal();
  const queryClient = useQueryClient();

  const isBlocked = isComplianceEnabled && rawIsBlocked;

  const checkCompliance = useCallback(async () => {
    if (!addressKey) return undefined;
    return Engine.context.ComplianceController.checkWalletsCompliance(
      addresses,
    );
  }, [addresses, addressKey]);

  // Latest-value ref assigned during render so it reflects the current wallet
  // the instant a switch causes a re-render — before the prefetch effect fires.
  // gate() reads this to detect a wallet switch that happens while a compliance
  // check is in flight.
  const currentAddressKeyRef = useRef(addressKey);
  currentAddressKeyRef.current = addressKey;

  // Prefetch compliance status on mount and whenever the address changes.
  // queryClient.prefetchQuery is keyed by address and respects staleTime, so
  // it's a no-op (no network call) when a fresh result is already cached —
  // whether that result came from this same prefetch or from a concurrent
  // gate() call for the same address.
  useEffect(() => {
    if (!isComplianceEnabled || !addressKey) return;
    queryClient.prefetchQuery({
      queryKey: complianceQueryKey(addressKey),
      queryFn: checkCompliance,
      ...COMPLIANCE_QUERY_OPTIONS,
    });
  }, [addressKey, checkCompliance, isComplianceEnabled, queryClient]);

  const gate = useCallback(
    async <T>(action: () => Promise<T>): Promise<T | void> => {
      if (!isComplianceEnabled) {
        DevLogger.log(
          '[useComplianceGate] Compliance disabled, skipping check',
        );
        return action();
      }

      // Capture the address at gate() entry — used after the await to detect
      // a wallet switch that happened while the check was in flight.
      const gateAddressKey = currentAddressKeyRef.current;

      let blocked = false;
      if (gateAddressKey) {
        try {
          // fetchQuery shares the same cache entry (and in-flight promise, if
          // any) as the mount-time prefetch above — a fresh cached result
          // resolves instantly with no network call; a stale one triggers
          // exactly one request, shared by every concurrent caller.
          const results = await queryClient.fetchQuery({
            queryKey: complianceQueryKey(gateAddressKey),
            queryFn: checkCompliance,
            ...COMPLIANCE_QUERY_OPTIONS,
          });
          blocked = results?.some((r) => r.blocked) ?? false;
        } catch {
          blocked = false; // fail-open on error
        }
      }

      // If the selected wallet changed while the check was in flight, abandon
      // silently. The action belonged to the previous wallet; the user retries
      // under the new one, which will have its own prefetch.
      if (currentAddressKeyRef.current !== gateAddressKey) {
        DevLogger.log(
          '[useComplianceGate] Wallet switched mid-check, abandoning',
        );
        return;
      }

      if (blocked) {
        DevLogger.log('[useComplianceGate] Wallet blocked, showing modal');
        showAccessRestrictedModal();
        return;
      }

      DevLogger.log('[useComplianceGate] Wallet not blocked, proceeding');
      return action();
    },
    [
      isComplianceEnabled,
      showAccessRestrictedModal,
      queryClient,
      checkCompliance,
    ],
  );

  return useMemo(
    () => ({ isComplianceEnabled, isBlocked, checkCompliance, gate }),
    [isComplianceEnabled, isBlocked, checkCompliance, gate],
  );
}
