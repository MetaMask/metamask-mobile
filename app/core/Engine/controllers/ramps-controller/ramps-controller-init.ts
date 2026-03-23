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
 * Determines whether the ramps unified buy V2 feature is enabled
 * by reading the remote feature flag state.
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

  const isV2Enabled = getIsRampsUnifiedBuyV2Enabled(initMessenger);

  if (isV2Enabled) {
    initMessenger.subscribe(
      'RampsController:orderStatusChanged',
      handleOrderStatusChangedForNotifications,
    );

    initMessenger.subscribe(
      'RampsController:orderStatusChanged',
      handleOrderStatusChangedForMetrics,
    );

    // Start init immediately so tokens (and providers) load on app start.
    // init() is async and does not block controller creation.
    controller
      .init()
      .then(() => {
        controller.startOrderPolling();
      })
      .catch(() => {
        // Initialization failed - error state will be available via selectors
      });
  }

  return {
    controller,
  };
};
