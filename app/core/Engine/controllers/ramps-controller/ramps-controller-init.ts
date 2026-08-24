import type { MessengerClientInitFunction } from '../../types';
import {
  RampsController,
  RampsControllerMessenger,
  getDefaultRampsControllerState,
} from '@metamask/ramps-controller';
import type { RampsControllerInitMessenger } from '../../messengers/ramps-controller-messenger';
import { handleOrderStatusChangedForNotifications } from './event-handlers/notification';
import { handleOrderStatusChangedForMetrics } from './event-handlers/analytics';
import { MetaMetricsEvents } from '../../../Analytics';
import { trace } from '../../../../util/trace';
import { buildAndTrackEvent } from '../../utils/analytics';

/**
 * Opt-in for the Ramps WebSocket debug dashboard (`RAMPS_DEBUG_DASHBOARD=true` in `.js.env`).
 * Only used under `__DEV__`; see `app/components/UI/Ramp/debug/README.md`.
 */
function isRampsDebugDashboardEnabled(): boolean {
  return process.env.RAMPS_DEBUG_DASHBOARD === 'true';
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
    // @ts-expect-error: Type of `TraceRequest` is different.
    trace,
    onOrderSyncErroneousSituation: (situationMessage) => {
      buildAndTrackEvent(
        initMessenger,
        MetaMetricsEvents.PROFILE_ACTIVITY_UPDATED.category,
        {
          feature_name: 'Ramps Order Sync',
          action: 'Ramps Order Sync Erroneous Situation',
          additional_description: situationMessage,
        },
      );
    },
    // The all-providers widening is driven by the `moneyHeadlessAllProviders`
    // remote feature flag, which the controller reads itself through the
    // `RemoteFeatureFlagController:getState` messenger action per quote call.
    // The widened-path default redirect URL is now derived inside core via
    // `RampsService:getDefaultRedirectCallbackUrl` (same environment as the
    // service). Keep that action delegated in the controller messenger.
  });

  let orderSubscriptionsRegistered = false;

  const registerOrderSubscriptions = (): void => {
    if (orderSubscriptionsRegistered) {
      return;
    }
    orderSubscriptionsRegistered = true;
    initMessenger.subscribe(
      'RampsController:orderStatusChanged',
      handleOrderStatusChangedForNotifications,
    );
    initMessenger.subscribe(
      'RampsController:orderStatusChanged',
      handleOrderStatusChangedForMetrics,
    );
  };

  const startRampsController = (): void => {
    registerOrderSubscriptions();
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
