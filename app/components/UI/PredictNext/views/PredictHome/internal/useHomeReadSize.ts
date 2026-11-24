import { useEffect, useState } from 'react';
import { useNetworkTierState } from '../../../../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../../../../util/deviceCapability';
import { isHomeReadConstrained } from './homeSections';

/** How long Home waits for NetInfo's first answer, once it can read, before
 * sizing its reads with the product default. */
export const NETWORK_TIER_GRACE_MS = 500;

/**
 * Whether Home reads short lists (see `isHomeReadConstrained`), decided once
 * per mount; undefined while undecided, and Home holds its reads until then.
 *
 * A read's size is part of its query key, so a change would refetch every
 * section and drop its cards. The size comes from NetInfo's first answer:
 * `useNetInfo` reports `unknown` until NetInfo answers, which is at once when
 * the app already knows the state and after a native round trip on a cold
 * start. If NetInfo has not answered {@link NETWORK_TIER_GRACE_MS} after
 * `canRead` turns true, the product default applies. The timer runs only
 * while the size is undecided.
 *
 * @param canRead - Whether Home has anything to read yet (the catalog is
 * ready); the grace period starts then.
 */
export const useHomeReadSize = (canRead: boolean): boolean | undefined => {
  // Synchronous and uncached, so read once per mount.
  const [hardwareTier] = useState(getHardwareTier);
  const networkTier = useNetworkTierState();
  const [isGraceOver, setIsGraceOver] = useState(false);
  const [isConstrained, setIsConstrained] = useState<boolean>();
  const isWaiting = isConstrained === undefined && canRead;
  useEffect(() => {
    if (!isWaiting) {
      return undefined;
    }
    const timer = setTimeout(() => setIsGraceOver(true), NETWORK_TIER_GRACE_MS);
    return () => clearTimeout(timer);
  }, [isWaiting]);
  if (isConstrained === undefined && (networkTier.isResolved || isGraceOver)) {
    setIsConstrained(
      isHomeReadConstrained(
        hardwareTier,
        networkTier.isResolved ? networkTier.tier : null,
      ),
    );
  }
  return isConstrained;
};
