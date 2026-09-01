import React, { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useSelector } from 'react-redux';
import {
  CHASE_ORDER_STATUS,
  ChaseOrderSuspensionError,
  PERPS_CONSTANTS,
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
  type ChaseOrderMaxDistanceReached,
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
import NotificationsService, {
  isPushPermissionGranted,
} from '../../../../util/notifications/services/NotificationService';
import { strings } from '../../../../../locales/i18n';
import { usePerpsEventTracking } from '../hooks/usePerpsEventTracking';
import { usePerpsChaseOrders } from '../hooks/usePerpsChaseOrders';
import { selectPerpsMobileChaseEnabledFlag } from '../selectors/featureFlags';
import { selectIsMetaMaskPushNotificationsEnabled } from '../../../../selectors/notifications';
import AppConstants from '../../../../core/AppConstants';

const MAX_REPORTED_CHASE_HANDLES = 100;

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
  const isPushNotificationsEnabled = useSelector(
    selectIsMetaMaskPushNotificationsEnabled,
  );
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
  const notifiedBackgroundedChaseHandlesRef = useRef(new Set<string>());
  const notifyingBackgroundedChaseHandlesRef = useRef(new Set<string>());
  const reportedMaxDistanceChaseHandlesRef = useRef(new Set<string>());
  const notifiedMaxDistanceChaseHandlesRef = useRef(new Set<string>());
  const notifyingMaxDistanceChaseHandlesRef = useRef(new Set<string>());
  const chaseLifecycleRef = useRef({
    shouldSuspendChaseOrders,
    suspendChaseOrders,
    track,
    isPushNotificationsEnabled,
  });
  chaseLifecycleRef.current = {
    shouldSuspendChaseOrders,
    suspendChaseOrders,
    track,
    isPushNotificationsEnabled,
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
    let didDeferDisconnectForChase = false;
    let didDisconnectThisCycle = false;

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
      const backgroundedOrders = orders.filter(
        (order) => order.status === CHASE_ORDER_STATUS.Backgrounded,
      );
      const unreportedOrders = backgroundedOrders.filter(
        (order) =>
          !reportedBackgroundedChaseHandlesRef.current.has(order.handle),
      );
      unreportedOrders.forEach((order) => {
        const reportedHandles = reportedBackgroundedChaseHandlesRef.current;
        reportedHandles.add(order.handle);
        while (reportedHandles.size > MAX_REPORTED_CHASE_HANDLES) {
          const oldestHandle = reportedHandles.values().next().value;
          if (oldestHandle === undefined) break;
          reportedHandles.delete(oldestHandle);
        }
      });
      unreportedOrders.forEach((order) => {
        chaseLifecycleRef.current.track(
          MetaMetricsEvents.PERPS_UI_INTERACTION,
          {
            [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
              PERPS_EVENT_VALUE.INTERACTION_TYPE.CHASE_BACKGROUNDED_CONVERTED,
            [PERPS_EVENT_PROPERTY.ASSET]: order.symbol,
          },
        );
      });
      const notificationOrders = backgroundedOrders.filter(
        (order) =>
          !notifiedBackgroundedChaseHandlesRef.current.has(order.handle) &&
          !notifyingBackgroundedChaseHandlesRef.current.has(order.handle),
      );
      if (notificationOrders.length === 0) return;
      notificationOrders.forEach((order) =>
        notifyingBackgroundedChaseHandlesRef.current.add(order.handle),
      );
      (async () => {
        if (!chaseLifecycleRef.current.isPushNotificationsEnabled) return;
        if (
          !(await isPushPermissionGranted()) ||
          !isActive ||
          !chaseLifecycleRef.current.isPushNotificationsEnabled
        ) {
          return;
        }
        const handles = notificationOrders
          .map((order) => order.handle)
          .sort((left, right) => left.localeCompare(right))
          .join('-');
        // Pending/notified handle sets make reported batches disjoint, so the
        // sorted-handle ID is stable and safe for notification deduplication.
        await NotificationsService.displayNotification({
          id: `perps-chase-backgrounded-${handles}`,
          pressActionId: PressActionId.OPEN_NOTIFICATIONS_VIEW,
          title: strings('perps.order.chase.backgrounded_title'),
          body:
            notificationOrders.length === 1
              ? strings('perps.order.chase.backgrounded_notification')
              : strings(
                  'perps.order.chase.backgrounded_notification_multiple',
                  {
                    count: notificationOrders.length,
                  },
                ),
          data: {
            notification_type:
              PERPS_EVENT_VALUE.NOTIFICATION_TYPE.CHASE_BACKGROUNDED,
            deeplink: `https://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/perps`,
          },
        });
        notificationOrders.forEach((order) => {
          const notifiedHandles = notifiedBackgroundedChaseHandlesRef.current;
          notifiedHandles.add(order.handle);
          while (notifiedHandles.size > MAX_REPORTED_CHASE_HANDLES) {
            const oldestHandle = notifiedHandles.values().next().value;
            if (oldestHandle === undefined) break;
            notifiedHandles.delete(oldestHandle);
          }
        });
      })()
        .catch((error) => {
          DevLogger.log('PerpsAlwaysOnProvider: Chase notification failed', {
            error: ensureError(
              error,
              'PerpsAlwaysOnProvider.displayNotification',
            ).message,
          });
        })
        .finally(() => {
          notificationOrders.forEach((order) =>
            notifyingBackgroundedChaseHandlesRef.current.delete(order.handle),
          );
        });
    };

    const handleChaseOrderMaxDistanceReached = (
      event: ChaseOrderMaxDistanceReached,
    ) => {
      const reportedHandles = reportedMaxDistanceChaseHandlesRef.current;
      if (!reportedHandles.has(event.handle)) {
        reportedHandles.add(event.handle);
        while (reportedHandles.size > MAX_REPORTED_CHASE_HANDLES) {
          const oldestHandle = reportedHandles.values().next().value;
          if (oldestHandle === undefined) break;
          reportedHandles.delete(oldestHandle);
        }
        chaseLifecycleRef.current.track(
          MetaMetricsEvents.PERPS_UI_INTERACTION,
          {
            [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
              PERPS_EVENT_VALUE.INTERACTION_TYPE.CHASE_TERMINATED,
            [PERPS_EVENT_PROPERTY.ASSET]: event.symbol,
          },
        );
      }

      if (
        notifiedMaxDistanceChaseHandlesRef.current.has(event.handle) ||
        notifyingMaxDistanceChaseHandlesRef.current.has(event.handle)
      ) {
        return;
      }
      notifyingMaxDistanceChaseHandlesRef.current.add(event.handle);
      (async () => {
        if (!chaseLifecycleRef.current.isPushNotificationsEnabled) return;
        if (
          !(await isPushPermissionGranted()) ||
          !isActive ||
          !chaseLifecycleRef.current.isPushNotificationsEnabled
        ) {
          return;
        }
        await NotificationsService.displayNotification({
          id: `perps-chase-max-distance-${event.handle}`,
          pressActionId: PressActionId.OPEN_NOTIFICATIONS_VIEW,
          title: strings('perps.order.chase.max_distance_reached_title'),
          body: strings('perps.order.chase.max_distance_reached_notification', {
            symbol: event.symbol,
          }),
          data: {
            deeplink: `https://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/perps-asset?symbol=${encodeURIComponent(event.symbol)}`,
          },
        });
        const notifiedHandles = notifiedMaxDistanceChaseHandlesRef.current;
        notifiedHandles.add(event.handle);
        while (notifiedHandles.size > MAX_REPORTED_CHASE_HANDLES) {
          const oldestHandle = notifiedHandles.values().next().value;
          if (oldestHandle === undefined) break;
          notifiedHandles.delete(oldestHandle);
        }
      })()
        .catch((error) => {
          DevLogger.log(
            'PerpsAlwaysOnProvider: Chase max-distance notification failed',
            {
              error: ensureError(
                error,
                'PerpsAlwaysOnProvider.displayMaxDistanceNotification',
              ).message,
            },
          );
        })
        .finally(() => {
          notifyingMaxDistanceChaseHandlesRef.current.delete(event.handle);
        });
    };

    Engine.controllerMessenger.subscribe(
      'PerpsController:chaseOrderMaxDistanceReached',
      handleChaseOrderMaxDistanceReached,
    );

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

      const isLeavingActive =
        prevState === 'active' &&
        Boolean(nextState.match(/inactive|background/));
      if (isLeavingActive) {
        didDeferDisconnectForChase =
          chaseLifecycleRef.current.shouldSuspendChaseOrders;
        if (!didDeferDisconnectForChase) {
          PerpsConnectionManager.disconnect();
          didDisconnectThisCycle = true;
        }
      }
      const shouldSuspendAtBackground =
        didDeferDisconnectForChase ||
        chaseLifecycleRef.current.shouldSuspendChaseOrders;
      if (
        shouldSuspendAtBackground &&
        nextState === 'background' &&
        prevState !== 'background'
      ) {
        const suspensionGeneration = ++lifecycleGeneration;
        lifecycleQueue = lifecycleQueue.then(async () => {
          if (
            !isActive ||
            suspensionGeneration !== lifecycleGeneration ||
            lastAppState !== 'background'
          ) {
            return;
          }
          const currentChaseLifecycle = chaseLifecycleRef.current;
          try {
            const orders = await currentChaseLifecycle.suspendChaseOrders(
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
            if (error instanceof ChaseOrderSuspensionError) {
              reportSuspendedChaseOrders(error.suspendedOrders);
            }
            DevLogger.log('PerpsAlwaysOnProvider: Chase suspension failed', {
              error: ensureError(error, 'PerpsAlwaysOnProvider.suspendChase')
                .message,
            });
          } finally {
            if (
              isActive &&
              suspensionGeneration === lifecycleGeneration &&
              lastAppState === 'background' &&
              !didDisconnectThisCycle
            ) {
              PerpsConnectionManager.disconnect();
              didDisconnectThisCycle = true;
            }
          }
        });
      } else if (
        nextState === 'background' &&
        prevState !== 'background' &&
        !didDisconnectThisCycle
      ) {
        PerpsConnectionManager.disconnect();
        didDisconnectThisCycle = true;
      } else if (nextState === 'active') {
        didDeferDisconnectForChase = false;
        didDisconnectThisCycle = false;
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
      Engine.controllerMessenger.unsubscribe(
        'PerpsController:chaseOrderMaxDistanceReached',
        handleChaseOrderMaxDistanceReached,
      );
      subscription.remove();
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      controller?.stopMarketDataPreload?.();
      const chaseLifecycle = chaseLifecycleRef.current;
      if (!chaseLifecycle.shouldSuspendChaseOrders) {
        PerpsConnectionManager.disconnect();
        return;
      }
      const isWalletRootUnmount = isPerpsEnabledRef.current;
      const suspension = isWalletRootUnmount
        ? chaseLifecycle.suspendChaseOrders()
        : chaseLifecycle.suspendChaseOrders(() => !isPerpsEnabledRef.current);
      suspension
        .then(reportSuspendedChaseOrders)
        .catch((error) => {
          if (error instanceof ChaseOrderSuspensionError) {
            reportSuspendedChaseOrders(error.suspendedOrders);
          }
          DevLogger.log(
            'PerpsAlwaysOnProvider: Chase suspension before disconnect failed',
            {
              error: ensureError(
                error,
                'PerpsAlwaysOnProvider.suspendBeforeDisconnect',
              ).message,
            },
          );
        })
        .finally(() => {
          if (isWalletRootUnmount || !isPerpsEnabledRef.current) {
            PerpsConnectionManager.disconnect();
          }
        });
    };
  }, [isPerpsEnabled]);

  return children;
};
