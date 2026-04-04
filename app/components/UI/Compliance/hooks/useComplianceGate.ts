import { useSelector } from 'react-redux';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import Engine from '../../../../core/Engine';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { selectAreAnyWalletsBlocked } from '../../../../selectors/complianceController';
import { selectComplianceEnabled } from '../../../../selectors/featureFlagController/compliance';
import { useAccessRestrictedModal } from '../contexts/AccessRestrictedContext';

type AddressInput = string | string[];

/**
 * Guards an async action behind an OFAC compliance check.
 *
 * On mount (and whenever `address` changes) the hook prefetches compliance
 * status in the background. When `gate(action)` is called it:
 * 1. Skips the check entirely when compliance is disabled via feature flag.
 * 2. Awaits the prefetch if it is still in-flight (race-condition guard for
 * users who tap very quickly after the screen loads).
 * 3. Shows `AccessRestrictedModal` and returns `undefined` if any address is
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
    () => (addressKey ? addressKey.split(',') : []),
    [addressKey],
  );

  const isComplianceEnabled = useSelector(selectComplianceEnabled);
  const rawIsBlocked = useSelector(selectAreAnyWalletsBlocked(addresses));
  const { showAccessRestrictedModal } = useAccessRestrictedModal();

  const isBlocked = isComplianceEnabled && rawIsBlocked;

  const checkCompliance = useCallback(async () => {
    if (!address) return undefined;
    return Engine.context.ComplianceController.checkWalletsCompliance(
      addresses,
    );
  }, [addresses, address]);

  // Holds the in-flight prefetch promise so gate() can await it if the user
  // taps a button before the prefetch has resolved.
  const prefetchRef = useRef<Promise<unknown> | null>(null);

  // Stores the resolved blocked status from the most recent API call.
  // Default false = fail-open: assume not blocked until the API says otherwise.
  // Reset to false at the start of each prefetch (while in-flight) so gate()
  // never reads a stale result from a previous address.
  const prefetchBlockedRef = useRef<boolean>(false);

  // Prefetch compliance status on mount and whenever the address changes.
  useEffect(() => {
    if (!isComplianceEnabled) {
      prefetchBlockedRef.current = false;
      return;
    }
    prefetchBlockedRef.current = false; // reset while in-flight
    prefetchRef.current = checkCompliance()
      .then((results) => {
        prefetchBlockedRef.current = results
          ? results.some((r) => r.blocked)
          : false;
      })
      .catch(() => {
        prefetchBlockedRef.current = false; // fail-open on error
        DevLogger.log('[useComplianceGate] Prefetch compliance check failed');
      });
  }, [isComplianceEnabled, checkCompliance]);

  const gate = useCallback(
    async <T>(action: () => Promise<T>): Promise<T | void> => {
      if (!isComplianceEnabled) {
        DevLogger.log(
          '[useComplianceGate] Compliance disabled, skipping check',
        );
        return action();
      }

      // If the prefetch is still in-flight (user tapped very quickly), wait for
      // it to settle so prefetchBlockedRef reflects the fresh API result.
      // If it has already resolved this is effectively instant (~0ms).
      await prefetchRef.current;

      // Read the fresh result from the ref — it was written by the prefetch
      // .then() handler, so no closure staleness or store access needed.
      const freshIsBlocked = isComplianceEnabled && prefetchBlockedRef.current;

      if (freshIsBlocked) {
        DevLogger.log('[useComplianceGate] Wallet blocked, showing modal');
        showAccessRestrictedModal();
        return;
      }

      DevLogger.log('[useComplianceGate] Wallet not blocked, proceeding');
      return action();
    },
    [isComplianceEnabled, showAccessRestrictedModal],
  );

  return useMemo(
    () => ({ isComplianceEnabled, isBlocked, checkCompliance, gate }),
    [isComplianceEnabled, isBlocked, checkCompliance, gate],
  );
}
