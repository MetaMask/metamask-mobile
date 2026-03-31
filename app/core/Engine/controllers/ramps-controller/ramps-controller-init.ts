import type { ControllerInitFunction } from '../../types';
import {
  RampsController,
  RampsControllerMessenger,
  getDefaultRampsControllerState,
} from '@metamask/ramps-controller';
import type { RampsControllerInitMessenger } from '../../messengers/ramps-controller-messenger';
import { validatedVersionGatedFeatureFlag } from '../../../../util/remoteFeatureFlag';
import { RAMPS_UNIFIED_BUY_V2_FLAG_KEY } from '../../../../selectors/featureFlagController/ramps/rampsUnifiedBuyV2';
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
 * Whether Unified Buy V2 is enabled per RemoteFeatureFlagController state.
 *
 * @param initMessenger - The init messenger to read RemoteFeatureFlagController state.
 * @returns Whether V2 is enabled.
 */
function getIsRampsUnifiedBuyV2Enabled(
  initMessenger: RampsControllerInitMessenger,
): boolean {
  try {
    const remoteState = initMessenger.call(
      'RemoteFeatureFlagController:getState',
    );
    const remoteFlag =
      remoteState?.remoteFeatureFlags?.[RAMPS_UNIFIED_BUY_V2_FLAG_KEY];
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  } catch {
    return false;
  }
}

/**
 * Initialize the ramps controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @param request.persistedState - The persisted state.
 * @param request.initMessenger - The init messenger for reading feature flags.
 * @returns The initialized controller.
 */
export const rampsControllerInit: ControllerInitFunction<
  RampsController,
  RampsControllerMessenger,
  RampsControllerInitMessenger
> = ({ controllerMessenger, persistedState, initMessenger }) => {
  const rampsControllerState =
    persistedState.RampsController ?? getDefaultRampsControllerState();

  const controller = new RampsController({
    messenger: controllerMessenger,
    state: rampsControllerState,
  });

  let orderSubscriptionsRegistered = false;

  const registerUnifiedBuyV2OrderSubscriptions = (): void => {
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

  const startUnifiedBuyV2IfEnabled = (): void => {
    if (!getIsRampsUnifiedBuyV2Enabled(initMessenger)) {
      return;
    }
    registerUnifiedBuyV2OrderSubscriptions();
    controller
      .init()
      .then(() => {
        controller.startOrderPolling();
      })
      .catch(() => {
        // Initialization failed - error state will be available via selectors
      });
  };

  startUnifiedBuyV2IfEnabled();

  // Remote flags can be empty on first Engine init and fill in once the
  // controller has fetched; re-check so RampsController.init() runs then.
  //
  // This event fires for any RemoteFeatureFlagController state update — not
  // only rampsUnifiedBuyV2. When V2 is off, startUnifiedBuyV2IfEnabled returns
  // immediately. When V2 is on, order subscriptions register once; init() and
  // startOrderPolling() are idempotent, so repeat invocations are safe.
  initMessenger.subscribe('RemoteFeatureFlagController:stateChange', () => {
    startUnifiedBuyV2IfEnabled();
  });

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
