import type { MessengerClientInitFunction } from '../../types';
import {
  RampsController,
  RampsControllerMessenger,
  getDefaultRampsControllerState,
} from '@metamask/ramps-controller';
import type { RampsControllerInitMessenger } from '../../messengers/ramps-controller-messenger';
import { handleOrderStatusChangedForNotifications } from './event-handlers/notification';
import { handleOrderStatusChangedForMetrics } from './event-handlers/analytics';
import Logger from '../../../../util/Logger';
import {
  type RampsActivityEvent,
  WebSocketState,
} from '@metamask/core-backend';
import ToastService from '../../../ToastService/ToastService';
import { ToastVariants } from '../../../../component-library/components/Toast/Toast.types';

/**
 * Opt-in for the Ramps WebSocket debug dashboard (`RAMPS_DEBUG_DASHBOARD=true` in `.js.env`).
 * Only used under `__DEV__`; see `app/components/UI/Ramp/debug/README.md`.
 */
function isRampsDebugDashboardEnabled(): boolean {
  return process.env.RAMPS_DEBUG_DASHBOARD === 'true';
}

/**
 * Surfaces `ramps-activity.v1` traffic on screen so the WebSocket path can be
 * verified by hand. Gated on `RAMP_DEV_BUILD` rather than `__DEV__` because the
 * `main-dev` APK is a release build, where `__DEV__` is false.
 *
 * @param label - The text to display.
 */
function showRampsActivityToast(label: string): void {
  if (process.env.RAMP_DEV_BUILD !== 'true') {
    return;
  }
  // Events can land before the UI mounts the toast ref; `showToast` throws in
  // that case, so check rather than catch.
  if (!ToastService.toastRef?.current) {
    return;
  }
  ToastService.showToast({
    variant: ToastVariants.Plain,
    labelOptions: [{ label }],
    hasNoTimeout: false,
  });
}

/**
 * Initialize the ramps controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @param request.persistedState - The persisted state.
 * @param request.initMessenger - The init messenger for order event subscriptions.
 * @returns The initialized controller.
 */
export const rampsControllerInit: MessengerClientInitFunction<
  RampsController,
  RampsControllerMessenger,
  RampsControllerInitMessenger
> = ({ controllerMessenger, persistedState, initMessenger }) => {
  const rampsControllerState =
    persistedState.RampsController ?? getDefaultRampsControllerState();

  const controller = new RampsController({
    messenger: controllerMessenger,
    state: rampsControllerState,
    // The all-providers widening is driven by the `moneyHeadlessAllProviders`
    // remote feature flag, which the controller reads itself through the
    // `RemoteFeatureFlagController:getState` messenger action per quote call.
    // The widened-path default redirect URL is now derived inside core via
    // `RampsService:getDefaultRedirectCallbackUrl` (same environment as the
    // service). Keep that action delegated in the controller messenger.
  });

  let subscriptionsRegistered = false;
  let refreshPromise: Promise<void> | undefined;
  let isRefreshQueued = false;

  const refreshAutoramps = (): void => {
    if (refreshPromise) {
      isRefreshQueued = true;
      return;
    }
    refreshPromise = controller
      .refreshAutoramps()
      .catch((error: unknown) => {
        Logger.error(
          error as Error,
          'RampsController: failed to refresh after ramps activity signal',
        );
      })
      .finally(() => {
        refreshPromise = undefined;
        if (isRefreshQueued) {
          isRefreshQueued = false;
          refreshAutoramps();
        }
      });
  };

  const registerSubscriptions = (): void => {
    if (subscriptionsRegistered) {
      return;
    }
    subscriptionsRegistered = true;
    initMessenger.subscribe(
      'RampsController:orderStatusChanged',
      handleOrderStatusChangedForNotifications,
    );
    initMessenger.subscribe(
      'RampsController:orderStatusChanged',
      handleOrderStatusChangedForMetrics,
    );
    initMessenger.subscribe(
      'RampsActivityService:eventReceived',
      (event: RampsActivityEvent) => {
        showRampsActivityToast(`Ramps activity: ${event.type}`);
        if (!event.needsFetch) {
          return;
        }
        refreshAutoramps();
      },
    );
    initMessenger.subscribe(
      'RampsActivityService:statusChanged',
      ({ status }) => {
        showRampsActivityToast(`Ramps WS: ${status}`);
        if (status === WebSocketState.CONNECTED) {
          refreshAutoramps();
        }
      },
    );
  };

  const startRampsController = (): void => {
    registerSubscriptions();
    controller
      .init()
      .then(() => {
        controller.startOrderPolling();
      })
      .catch(() => {
        // Initialization failed - error state will be available via selectors
      });
  };

  startRampsController();

  // Dev-only: streams controller state / traffic to the local dashboard (see Ramp/debug/README.md).
  // Use require (not dynamic import) so Jest can mock the module; Metro drops this block in prod (__DEV__ false).
  // Opt-in: set RAMPS_DEBUG_DASHBOARD=true (see `isRampsDebugDashboardEnabled` above).
  if (__DEV__ && isRampsDebugDashboardEnabled()) {
    try {
      const { initRampsDebugBridge } =
        // eslint-disable-next-line @typescript-eslint/no-require-imports -- dev-only optional tooling; Jest cannot mock dynamic import()
        require('../../../../components/UI/Ramp/debug/RampsDebugBridge');
      initRampsDebugBridge(controller, controllerMessenger);
    } catch {
      /* optional dev tooling — ignore load failures */
    }
  }

  return {
    controller,
  };
};
