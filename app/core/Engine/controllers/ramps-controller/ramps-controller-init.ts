import type { MessengerClientInitFunction } from '../../types';
import {
  RampsController,
  RampsControllerMessenger,
  getDefaultRampsControllerState,
} from '@metamask/ramps-controller';
import type { RampsControllerInitMessenger } from '../../messengers/ramps-controller-messenger';
import { handleOrderStatusChangedForNotifications } from './event-handlers/notification';
import { handleOrderStatusChangedForMetrics } from './event-handlers/analytics';
import {
  handleAutorampTransactionStatusChangedForMetrics,
  type AutorampTransactionStatusChangedPayload,
} from './event-handlers/vbaTransactionAnalytics';

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

  // The all-providers widening is driven by the `moneyHeadlessAllProviders`
  // remote feature flag, which the controller reads itself. The widened-path
  // default redirect URL is derived inside core.
  //
  // `trackAutorampTransactionStatusChanged` lands with the
  // @metamask/ramps-controller release that adds it. The installed constructor
  // type does not include the option yet, so the callback is attached on a
  // variable rather than an object literal.
  const options: ConstructorParameters<typeof RampsController>[0] & {
    trackAutorampTransactionStatusChanged: (
      payload: AutorampTransactionStatusChangedPayload,
    ) => void;
  } = {
    messenger: controllerMessenger,
    state: rampsControllerState,
    trackAutorampTransactionStatusChanged:
      handleAutorampTransactionStatusChangedForMetrics,
  };
  const controller = new RampsController(options);

  let orderSubscriptionsRegistered = false;
  let walletUnlocked = false;

  const registerOrderSubscriptions = (): void => {
    if (orderSubscriptionsRegistered) {
      return;
    }
    orderSubscriptionsRegistered = true;
    // Stopping the poller does not cancel a request already in flight, so a
    // transition can still arrive just after the wallet locks. No toast on the
    // lock screen.
    initMessenger.subscribe('RampsController:orderStatusChanged', (event) => {
      if (walletUnlocked) {
        handleOrderStatusChangedForNotifications(event);
      }
    });
    initMessenger.subscribe(
      'RampsController:orderStatusChanged',
      handleOrderStatusChangedForMetrics,
    );
  };

  // Order polling raises purchase toasts, so it only runs while the wallet is
  // unlocked. Polling started at init would keep toasting on the lock screen.
  let controllerInitialized = false;

  const syncOrderPolling = (): void => {
    if (controllerInitialized && walletUnlocked) {
      controller.startOrderPolling();
    } else {
      controller.stopOrderPolling();
    }
  };

  const registerLockSubscriptions = (): void => {
    initMessenger.subscribe('KeyringController:unlock', () => {
      walletUnlocked = true;
      syncOrderPolling();
    });
    initMessenger.subscribe('KeyringController:lock', () => {
      walletUnlocked = false;
      syncOrderPolling();
    });
    try {
      walletUnlocked =
        initMessenger.call('KeyringController:getState').isUnlocked === true;
    } catch {
      // Keyring not available yet - the unlock event will start polling.
      walletUnlocked = false;
    }
  };

  const startRampsController = (): void => {
    registerOrderSubscriptions();
    registerLockSubscriptions();
    controller
      .init()
      .then(() => {
        controllerInitialized = true;
        syncOrderPolling();
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
