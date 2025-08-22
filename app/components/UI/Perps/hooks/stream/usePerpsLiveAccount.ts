import { useState, useEffect } from 'react';
import { usePerpsStream } from '../../providers/PerpsStreamManager';
import {
  shouldDisablePerpsStreaming,
  getE2EMockData,
  subscribeToE2EMockDataChanges,
} from '../../utils/e2eUtils';
import type { AccountState } from '../../controllers/types';

export interface UsePerpsLiveAccountOptions {
  /** Throttle delay in milliseconds (default: 1000ms for balance updates) */
  throttleMs?: number;
}

export interface UsePerpsLiveAccountReturn {
  /** Current account state with balances and margin info */
  account: AccountState | null;
  /** Whether we're waiting for the first real WebSocket data */
  isInitialLoading: boolean;
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
  const [e2eAccountState, setE2eAccountState] = useState<AccountState | null>(
    null,
  );

  // E2E Mode: Use reactive mock account data
  if (shouldDisablePerpsStreaming()) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      // Initialize with current mock data
      const mockData = getE2EMockData();
      setE2eAccountState(mockData.accountState);

      // Subscribe to changes
      const unsubscribe = subscribeToE2EMockDataChanges(() => {
        const updatedMockData = getE2EMockData();
        setE2eAccountState(updatedMockData.accountState);
      });

      return unsubscribe;
    }, []);

    return {
      account: e2eAccountState,
      isInitialLoading: false,
    };
  }

  const { throttleMs = 1000 } = options;
  const [account, setAccount] = useState<AccountState | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const streamManager = usePerpsStream();

  useEffect(() => {
    if (!streamManager) return;

    // Mark as no longer loading once we get first update
    const handleAccountUpdate = (newAccount: AccountState | null) => {
      setAccount(newAccount);
      // Only set loading to false if we have actual data
      if (newAccount !== null) {
        setIsInitialLoading(false);
      }
    };

    const unsubscribe = streamManager.account.subscribe({
      callback: handleAccountUpdate,
      throttleMs,
    });

    return unsubscribe;
  }, [streamManager, throttleMs]);

  return { account, isInitialLoading };
}
