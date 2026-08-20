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

  const isBlocked = isComplianceEnabled && rawIsBlocked;

  const checkCompliance = useCallback(async () => {
    if (!addressKey) return undefined;
    return Engine.context.ComplianceController.checkWalletsCompliance(
      addresses,
    );
  }, [addresses, addressKey]);

  // Holds the in-flight prefetch tagged with the address set it belongs to, so
  // gate() can verify the cached prefetch belongs to the current wallet before
  // trusting it.
  const prefetchRef = useRef<{
    addressKey: string;
    promise: Promise<unknown>;
  } | null>(null);

  // Stores the resolved blocked status from the most recent prefetch.
  // Default false = fail-open: assume not blocked until the API says otherwise.
  // Reset to false at the start of each prefetch (while in-flight) so gate()
  // never reads a stale result from a previous address.
  const prefetchBlockedRef = useRef<boolean>(false);

  // Guards against a slow in-flight prefetch for a previous address resolving
  // late and overwriting prefetchBlockedRef for the current address.
  const requestIdRef = useRef(0);

  // Latest-value ref assigned during render so it reflects the current wallet
  // the instant a switch causes a re-render — before the prefetch effect fires.
  // gate() reads this to detect a wallet switch that happens while a compliance
  // check is in flight.
  const currentAddressKeyRef = useRef(addressKey);
  currentAddressKeyRef.current = addressKey;

  // Keep gate stable for consumers while allowing its fallback path to call the
  // latest address-bound compliance check after a render-before-effect wallet switch.
  const checkComplianceRef = useRef(checkCompliance);
  checkComplianceRef.current = checkCompliance;

  // Prefetch compliance status on mount and whenever the address changes.
  // `checkCompliance` is memoized on `addresses`, so its identity changes
  // exactly when the address set changes — that (not `addresses.length`, which
  // stays constant across an account switch) is the correct re-fetch signal.
  useEffect(() => {
    if (!isComplianceEnabled) {
      prefetchBlockedRef.current = false;
      prefetchRef.current = null;
      return;
    }
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    prefetchBlockedRef.current = false; // reset while in-flight
    const promise = checkCompliance()
      .then((results) => {
        if (requestIdRef.current === requestId) {
          prefetchBlockedRef.current = results
            ? results.some((r) => r.blocked)
            : false;
        }
      })
      .catch(() => {
        if (requestIdRef.current === requestId) {
          prefetchBlockedRef.current = false; // fail-open on error
          DevLogger.log('[useComplianceGate] Prefetch compliance check failed');
        }
      });
    prefetchRef.current = { addressKey, promise };
  }, [addressKey, checkCompliance, isComplianceEnabled]);

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
      const prefetch = prefetchRef.current;

      let blocked: boolean;
      if (prefetch && prefetch.addressKey === gateAddressKey) {
        // Common path: trust the prefetch for the current wallet. Await it in
        // case the user tapped before it settled (instant if already resolved).
        await prefetch.promise;
        blocked = prefetchBlockedRef.current;
      } else {
        // Transient window after a wallet switch, before the effect fires —
        // no prefetch exists yet for the current address. Do a one-off check,
        // failing open on error.
        let results: { blocked: boolean }[] | undefined;
        try {
          results = await checkComplianceRef.current();
        } catch {
          results = undefined;
        }
        blocked = results?.some((r) => r.blocked) ?? false;
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
    [isComplianceEnabled, showAccessRestrictedModal],
  );

  return useMemo(
    () => ({ isComplianceEnabled, isBlocked, checkCompliance, gate }),
    [isComplianceEnabled, isBlocked, checkCompliance, gate],
  );
}
