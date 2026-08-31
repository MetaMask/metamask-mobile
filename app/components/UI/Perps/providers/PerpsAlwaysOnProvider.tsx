import React, { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useSelector } from 'react-redux';
import {
  PERPS_CONSTANTS,
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';
import { PerpsConnectionManager } from '../services/PerpsConnectionManager';
import { PERPS_CONNECTION_SOURCE } from '../constants/perpsConfig';
import { selectPerpsEnabledFlag } from '../index';
import Engine from '../../../../core/Engine';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { ensureError } from '../../../../util/errorUtils';
import { initPerpsLifecycleTracking } from '../utils/perpsLifecycleContext';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { PressActionId } from '../../../../util/notifications';
import NotificationsService from '../../../../util/notifications/services/NotificationService';
import { strings } from '../../../../../locales/i18n';
import { usePerpsEventTracking } from '../hooks/usePerpsEventTracking';
import { usePerpsChaseOrders } from '../hooks/usePerpsChaseOrders';
import { selectPerpsMobileChaseEnabledFlag } from '../selectors/featureFlags';

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
  const isPerpsEnabledRef = useRef(isPerpsEnabled);
  isPerpsEnabledRef.current = isPerpsEnabled;
  const { track } = usePerpsEventTracking();
  const isChaseEnabled = useSelector(selectPerpsMobileChaseEnabledFlag);
  const {
    hasLiveChaseOrders,
    isChaseOrderDiscoveryResolved,
    suspendChaseOrders,
  } = usePerpsChaseOrders({
    isEnabled: isPerpsEnabled && isChaseEnabled,
  });
  const shouldSuspendChaseOrders =
    isChaseEnabled || hasLiveChaseOrders || !isChaseOrderDiscoveryResolved;
  const reportedBackgroundedChaseHandlesRef = useRef(new Set<string>());
  const chaseLifecycleRef = useRef({
    shouldSuspendChaseOrders,
    suspendChaseOrders,
    track,
  });
  chaseLifecycleRef.current = {
    shouldSuspendChaseOrders,
    suspendChaseOrders,
    track,
  };

  // Track AppState so Perps CUF spans can tag lifecycle_context.
  useEffect(() => initPerpsLifecycleTracking(), []);

  useEffect(() => {
    const controller = Engine.context.PerpsController;

    if (!isPerpsEnabled) {
      controller?.stopMarketDataPreload?.();
      return;
    }

    // Keep the legacy preload lifecycle attached to the always-on provider so
    // it runs in both wallet tab and homepage-sections flows.
    controller?.startMarketDataPreload?.();

    let isActive = true;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let lastAppState = AppState.currentState;
    let lifecycleQueue: Promise<void> = Promise.resolve();
    let lifecycleGeneration = 0;

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

    const reportSuspendedChaseOrders = (
      orders: Awaited<ReturnType<typeof suspendChaseOrders>>,
    ) => {
      const suspendedOrders = orders.filter(
        (order) =>
          order.status === 'backgrounded' &&
          !reportedBackgroundedChaseHandlesRef.current.has(order.handle),
      );
      if (suspendedOrders.length === 0) return;
      suspendedOrders.forEach((order) =>
        reportedBackgroundedChaseHandlesRef.current.add(order.handle),
      );
      const chaseLifecycle = chaseLifecycleRef.current;
      chaseLifecycle.track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.CHASE_BACKGROUNDED_CONVERTED,
        [PERPS_EVENT_PROPERTY.ASSET]: suspendedOrders[0].symbol,
      });
      NotificationsService.displayNotification({
        pressActionId: PressActionId.OPEN_NOTIFICATIONS_VIEW,
        title: strings('perps.order.chase.backgrounded_title'),
        body: strings('perps.order.chase.backgrounded_notification'),
        data: {
          notification_type:
            PERPS_EVENT_VALUE.NOTIFICATION_TYPE.CHASE_BACKGROUNDED,
        },
      }).catch((error) => {
        DevLogger.log('PerpsAlwaysOnProvider: Chase notification failed', {
          error: ensureError(error, 'PerpsAlwaysOnProvider.displayNotification')
            .message,
        });
      });
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

      // iOS emits `inactive` for transient overlays as well as on the way to
      // `background`. Chase must keep running until the app actually enters
      // background, otherwise opening Control Center converts live sessions.
      if (nextState === 'background' && prevState !== 'background') {
        const suspensionGeneration = ++lifecycleGeneration;
        lifecycleQueue = lifecycleQueue.then(async () => {
          if (
            !isActive ||
            suspensionGeneration !== lifecycleGeneration ||
            lastAppState !== 'background'
          ) {
            return;
          }
          const chaseLifecycle = chaseLifecycleRef.current;
          if (!chaseLifecycle.shouldSuspendChaseOrders) {
            PerpsConnectionManager.disconnect();
            return;
          }
          try {
            const orders = await chaseLifecycle.suspendChaseOrders(
              () =>
                isActive &&
                suspensionGeneration === lifecycleGeneration &&
                lastAppState === 'background',
            );
            if (
              !isActive ||
              suspensionGeneration !== lifecycleGeneration ||
              lastAppState !== 'background'
            ) {
              return;
            }
            reportSuspendedChaseOrders(orders);
          } catch (error) {
            DevLogger.log('PerpsAlwaysOnProvider: Chase suspension failed', {
              error: ensureError(error, 'PerpsAlwaysOnProvider.suspendChase')
                .message,
            });
          } finally {
            if (
              isActive &&
              suspensionGeneration === lifecycleGeneration &&
              lastAppState === 'background'
            ) {
              PerpsConnectionManager.disconnect();
            }
          }
        });
      } else if (nextState === 'active') {
        lifecycleGeneration += 1;
        // Small delay to allow system to stabilize after background
        scheduleSilentEnsureConnected(
          PERPS_CONNECTION_SOURCE.WALLET_ROOT_FOREGROUND,
          PERPS_CONSTANTS.ReconnectionDelayAndroidMs,
        );
      }
    });

    return () => {
      isActive = false;
      lifecycleGeneration += 1;
      subscription.remove();
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      controller?.stopMarketDataPreload?.();
      if (isPerpsEnabledRef.current) {
        PerpsConnectionManager.disconnect();
        return;
      }

      const chaseLifecycle = chaseLifecycleRef.current;
      if (!chaseLifecycle.shouldSuspendChaseOrders) {
        PerpsConnectionManager.disconnect();
        return;
      }
      chaseLifecycle
        .suspendChaseOrders(() => !isPerpsEnabledRef.current)
        .then(reportSuspendedChaseOrders)
        .catch((error) => {
          DevLogger.log(
            'PerpsAlwaysOnProvider: Chase suspension before disable failed',
            {
              error: ensureError(
                error,
                'PerpsAlwaysOnProvider.suspendBeforeDisable',
              ).message,
            },
          );
        })
        .finally(() => {
          if (!isPerpsEnabledRef.current) {
            PerpsConnectionManager.disconnect();
          }
        });
    };
  }, [isPerpsEnabled]);

  return children;
};
