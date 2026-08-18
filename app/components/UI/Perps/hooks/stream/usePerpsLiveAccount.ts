import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  usePerpsStream,
  type StreamUpdateSource,
} from '../../providers/PerpsStreamManager';
import { type AccountState } from '@metamask/perps-controller';
import { hasPreloadedData, getPreloadedData } from './hasCachedPerpsData';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../../../selectors/multichainAccounts/accountTreeController';
import {
  createHomepagePerpsDelivery,
  isHomepagePerformanceProbeActive,
  logHomepagePerformanceStage,
  type HomepagePerpsDeliveryMetadata,
} from '../../utils/homepagePerformanceProbe';

export interface UsePerpsLiveAccountOptions {
  /** Whether to subscribe to account updates. */
  enabled?: boolean;
  /** Throttle delay in milliseconds (default: 1000ms for balance updates) */
  throttleMs?: number;
  includeDeliveryMetadata?: boolean;
}

export interface UsePerpsLiveAccountReturn {
  /** Current account state with balances and margin info */
  account: AccountState | null;
  /** Whether we're waiting for the first real WebSocket data */
  isInitialLoading: boolean;
  latestDelivery?: HomepagePerpsDeliveryMetadata;
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
  const {
    enabled = true,
    throttleMs = 1000,
    includeDeliveryMetadata = false,
  } = options;
  const streamManager = usePerpsStream();
  const selectedAddress = useSelector(
    selectSelectedAccountGroupEvmInternalAccount,
  )?.address.toLowerCase();
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
  const [latestDelivery, setLatestDelivery] =
    useState<HomepagePerpsDeliveryMetadata>();

  useEffect(() => {
    if (!enabled || !streamManager) return;

    // Mark as no longer loading once we get first update
    const handleAccountUpdate = (
      newAccount: AccountState | null,
      source?: StreamUpdateSource,
    ) => {
      setAccount(newAccount);
      setAccountAddress(selectedAddress);
      if (newAccount === null) {
        setIsInitialLoading(true);
        setLatestDelivery(undefined);
        return;
      }
      if (
        includeDeliveryMetadata &&
        source !== undefined &&
        source !== 'optimistic' &&
        isHomepagePerformanceProbeActive()
      ) {
        const delivery = createHomepagePerpsDelivery({
          stream: 'account',
          source,
          itemCount: 1,
        });
        logHomepagePerformanceStage('subscriber_delivery', delivery);
        setLatestDelivery(delivery);
      }
      // Only set loading to false if we have actual data
      setIsInitialLoading(false);
    };

    const unsubscribe = streamManager.account.subscribe({
      callback: handleAccountUpdate,
      throttleMs,
      ...(includeDeliveryMetadata && { includeDeliverySource: true }),
    });

    return unsubscribe;
  }, [
    enabled,
    includeDeliveryMetadata,
    selectedAddress,
    streamManager,
    throttleMs,
  ]);

  const identityMatches = accountAddress === selectedAddress;
  return {
    account: identityMatches ? account : null,
    isInitialLoading: !identityMatches || isInitialLoading,
    ...(identityMatches && latestDelivery ? { latestDelivery } : {}),
  };
}
