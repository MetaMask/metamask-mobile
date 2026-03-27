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

  initMessenger.subscribe('RemoteFeatureFlagController:stateChange', () => {
    startUnifiedBuyV2IfEnabled();
  });

  return {
    controller,
  };
};
