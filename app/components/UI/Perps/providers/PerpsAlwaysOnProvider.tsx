import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { useSelector } from 'react-redux';
import { PERPS_CONSTANTS } from '@metamask/perps-controller';
import { PerpsConnectionManager } from '../services/PerpsConnectionManager';
import { PERPS_CONNECTION_SOURCE } from '../constants/perpsConfig';
import { selectPerpsEnabledFlag } from '../index';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { ensureError } from '../../../../util/errorUtils';

/**
 * Top-level always-on provider for Perps WebSocket connections.
 *
 * Mounts once at the wallet root and manages the singleton
 * PerpsConnectionManager lifecycle for the entire app lifetime:
 * - Connects on mount (when perps is enabled)
 * - Disconnects when app goes to background (20s grace period in manager)
 * - Reconnects when app returns to foreground
 * - Disconnects on unmount
 *
 * This replaces the per-section PerpsConnectionProvider connect/disconnect
 * logic to eliminate reference-count edge cases from multiple simultaneous
 * provider instances.
 *
 * Connection failures are caught and logged — they never propagate to the
 * wallet render tree, so a perps outage cannot block the rest of the app.
 */
export const PerpsAlwaysOnProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);

  useEffect(() => {
    if (!isPerpsEnabled) return;

    let isActive = true;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let lastAppState = AppState.currentState;

    const scheduleSilentEnsureConnected = (source: string, delayMs: number) => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }

      reconnectTimer = setTimeout(() => {
        PerpsConnectionManager.resumeFromForeground({
          source,
          suppressError: true,
        }).catch((err) => {
          DevLogger.log(
            'PerpsAlwaysOnProvider: silent connection attempt failed',
            {
              error: ensureError(err, 'PerpsAlwaysOnProvider.silentConnect')
                .message,
              source,
            },
          );
        });
        reconnectTimer = undefined;
      }, delayMs);
    };

    PerpsConnectionManager.resumeFromForeground({
      source: PERPS_CONNECTION_SOURCE.WALLET_ROOT_MOUNT,
      suppressError: true,
    }).catch((err) => {
      if (!isActive) return;
      DevLogger.log('PerpsAlwaysOnProvider: initial always-on connect failed', {
        error: ensureError(err, 'PerpsAlwaysOnProvider.connect').message,
      });
      scheduleSilentEnsureConnected(
        PERPS_CONNECTION_SOURCE.WALLET_ROOT_RETRY,
        PERPS_CONSTANTS.ConnectRetryDelayMs,
      );
    });

    const subscription = AppState.addEventListener('change', (nextState) => {
      const prevState = lastAppState;
      lastAppState = nextState;

      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = undefined;
      }

      // Only disconnect when leaving active state — avoids the duplicate
      // disconnect on iOS where backgrounding fires active → inactive → background.
      if (prevState === 'active' && nextState.match(/inactive|background/)) {
        PerpsConnectionManager.disconnect();
      } else if (nextState === 'active') {
        // Small delay to allow system to stabilize after background
        scheduleSilentEnsureConnected(
          PERPS_CONNECTION_SOURCE.WALLET_ROOT_FOREGROUND,
          PERPS_CONSTANTS.ReconnectionDelayAndroidMs,
        );
      }
    });

    return () => {
      isActive = false;
      subscription.remove();
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      PerpsConnectionManager.disconnect();
    };
  }, [isPerpsEnabled]);

  return children;
};
