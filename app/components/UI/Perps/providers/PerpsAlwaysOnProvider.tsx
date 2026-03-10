import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { useSelector } from 'react-redux';
import { PERPS_CONSTANTS } from '@metamask/perps-controller';
import { PerpsConnectionManager } from '../services/PerpsConnectionManager';
import { selectPerpsEnabledFlag } from '../index';
import Logger from '../../../../util/Logger';
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

    PerpsConnectionManager.connect().catch((err) => {
      Logger.error(ensureError(err, 'PerpsAlwaysOnProvider.connect'), {
        tags: { feature: PERPS_CONSTANTS.FeatureName },
        context: { name: 'PerpsAlwaysOnProvider.connect', data: {} },
      });
    });

    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let lastAppState = AppState.currentState;

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
        reconnectTimer = setTimeout(() => {
          PerpsConnectionManager.connect().catch((err) => {
            Logger.error(ensureError(err, 'PerpsAlwaysOnProvider.reconnect'), {
              tags: { feature: PERPS_CONSTANTS.FeatureName },
              context: {
                name: 'PerpsAlwaysOnProvider.reconnect',
                data: {},
              },
            });
          });
          reconnectTimer = undefined;
        }, PERPS_CONSTANTS.ReconnectionDelayAndroidMs);
      }
    });

    return () => {
      subscription.remove();
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      PerpsConnectionManager.disconnect();
    };
  }, [isPerpsEnabled]);

  return children;
};
