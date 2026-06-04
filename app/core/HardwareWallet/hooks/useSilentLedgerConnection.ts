import { useCallback, useRef } from 'react';
import { HardwareWalletType } from '@metamask/hw-wallet-sdk';
import { createAdapter } from '../adapters/factory';
import { getDeviceId } from '../../Ledger/Ledger';

const SILENT_CONNECTION_TIMEOUT_MS = 5000;

export type ConnectionCheckResult = 'connected' | 'disconnected';

/**
 * Hook that performs a silent BLE connection check for Ledger devices.
 * Creates a temporary adapter, attempts to connect to the last known device,
 * then cleans up. Returns a `checkConnection` function that resolves to
 * 'connected' or 'disconnected'.
 */
export function useSilentLedgerConnection() {
  const checkInProgress = useRef(false);

  const checkConnection =
    useCallback(async (): Promise<ConnectionCheckResult> => {
      if (checkInProgress.current) {
        return 'disconnected';
      }

      checkInProgress.current = true;

      const adapter = createAdapter(HardwareWalletType.Ledger, {
        onDisconnect: () => undefined,
        onDeviceEvent: () => undefined,
      });

      try {
        const deviceId = await getDeviceId();

        if (!deviceId) {
          return 'disconnected';
        }

        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(
            () => reject(new Error('Silent connection timeout')),
            SILENT_CONNECTION_TIMEOUT_MS,
          );
        });

        await Promise.race([adapter.connect(deviceId), timeoutPromise]).finally(
          () => {
            if (timeoutId) clearTimeout(timeoutId);
          },
        );
        return 'connected';
      } catch {
        return 'disconnected';
      } finally {
        checkInProgress.current = false;
        try {
          await adapter.disconnect();
        } catch {
          // Ignore disconnect errors during cleanup
        }
        adapter.destroy();
      }
    }, []);

  return { checkConnection };
}
