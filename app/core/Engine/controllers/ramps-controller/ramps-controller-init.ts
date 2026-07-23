import type { MessengerClientInitFunction } from '../../types';
import {
  RampsController,
  RampsControllerMessenger,
  getDefaultRampsControllerState,
} from '@metamask/ramps-controller';
import type { RampsControllerInitMessenger } from '../../messengers/ramps-controller-messenger';
import { getRampCallbackBaseUrl } from '../../../../components/UI/Ramp/utils/getRampCallbackBaseUrl';
import { handleOrderStatusChangedForNotifications } from './event-handlers/notification';
import { handleOrderStatusChangedForMetrics } from './event-handlers/analytics';

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
    // The all-providers widening is driven by the `moneyHeadlessAllProviders`
    // remote feature flag, which the controller reads itself through the
    // `RemoteFeatureFlagController:getState` messenger action per quote call.
    // Default redirect URL for the widened quote fetch. MM Pay's quote
    // request omits `redirectUrl`, so aggregator quotes would come back without
    // the buy-widget URL the headless Checkout WebView needs; supply the same
    // callback base the UB2 flow uses so the widened path can open the WebView.
    // TODO(TRAM-3757): Derive this default redirect URL inside RampsController
    // from its RampsEnvironment (RampsService.getBaseUrl) instead of injecting
    // it from the client here; this callback duplicates a value core already has.
    getDefaultRedirectUrl: () => getRampCallbackBaseUrl(),
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
