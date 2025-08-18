import { useState, useEffect } from 'react';
import { usePerpsStream } from '../../providers/PerpsStreamManager';
import type { AccountState } from '../../controllers/types';

/**
 * Hook to subscribe to live account updates via WebSocket
 * @param throttleMs - Time in milliseconds to throttle updates (default: 1000ms)
 * @returns Account state or null if not available
 */
export function usePerpsLiveAccount(throttleMs = 1000): AccountState | null {
  const [account, setAccount] = useState<AccountState | null>(null);
  const streamManager = usePerpsStream();

  useEffect(() => {
    if (!streamManager) return;

    const unsubscribe = streamManager.account.subscribe({
      callback: setAccount,
      throttleMs,
    });

    return unsubscribe;
  }, [streamManager, throttleMs]);

  return account;
}
