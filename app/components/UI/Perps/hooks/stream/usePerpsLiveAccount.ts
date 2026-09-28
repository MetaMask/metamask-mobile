import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { usePerpsStream } from '../../providers/PerpsStreamManager';
import { type AccountState } from '@metamask/perps-controller';
import { hasPreloadedData, getPreloadedData } from './hasCachedPerpsData';
import { selectPerpsSelectedAccountAddress } from '../../selectors/selectedAccountAddress';

export interface UsePerpsLiveAccountOptions {
  /** Whether to subscribe to account updates. */
  enabled?: boolean;
  /** Throttle delay in milliseconds (default: 1000ms for balance updates) */
  throttleMs?: number;
}

export interface UsePerpsLiveAccountReturn {
  /** Current account state with balances and margin info */
  account: AccountState | null;
  /** Whether we're waiting for the first real WebSocket data */
  isInitialLoading: boolean;
  /** Deliveries accepted by this selected-account subscription. */
  deliveryRevision?: number;
}

/**
 * Hook to subscribe to live account updates via WebSocket
 * Replaces polling-based account state fetching
 *
 * Account balance updates are throttled by default to 1 second since
 * balance changes don't need instant updates and this reduces UI flicker.
 *
 * @param options - Configuration options for the hook
 * @returns Object containing account state and loading state
 */
export function usePerpsLiveAccount(
  options: UsePerpsLiveAccountOptions = {},
): UsePerpsLiveAccountReturn {
  const { enabled = true, throttleMs = 1000 } = options;
  const streamManager = usePerpsStream();
  const selectedAddress = useSelector(selectPerpsSelectedAccountAddress);
  const initialChannelAccount = streamManager.account.getSnapshot();
  const [account, setAccount] = useState<AccountState | null>(() => {
    const cached =
      initialChannelAccount ??
      getPreloadedData<AccountState>('cachedAccountState');
    return cached;
  });
  const [accountAddress, setAccountAddress] = useState(selectedAddress);
  const [isInitialLoading, setIsInitialLoading] = useState(() => {
    if (initialChannelAccount !== null && initialChannelAccount !== undefined) {
      return false;
    }
    const hasCached = hasPreloadedData('cachedAccountState');
    return !hasCached;
  });
  const [deliveryRevision, setDeliveryRevision] = useState(0);
  const acceptedDeliveryRef = useRef(false);

  useEffect(() => {
    if (!enabled || !streamManager) return;

    // Mark as no longer loading once we get first update
    const handleAccountUpdate = (newAccount: AccountState | null) => {
      acceptedDeliveryRef.current = false;
      setAccount(newAccount);
      setAccountAddress(selectedAddress);
      if (newAccount === null) {
        setIsInitialLoading(true);
        return;
      }
      // Only set loading to false if we have actual data
      setIsInitialLoading(false);
      acceptedDeliveryRef.current = true;
    };

    const unsubscribe = streamManager.account.subscribe({
      callback: handleAccountUpdate,
      onDelivery: (source) => {
        if (source === 'fresh' && acceptedDeliveryRef.current) {
          setDeliveryRevision((revision) => revision + 1);
        }
        acceptedDeliveryRef.current = false;
      },
      throttleMs,
    });

    return unsubscribe;
  }, [enabled, selectedAddress, streamManager, throttleMs]);

  const identityMatches = accountAddress === selectedAddress;
  return {
    account: identityMatches ? account : null,
    isInitialLoading: !identityMatches || isInitialLoading,
    deliveryRevision,
  };
}
