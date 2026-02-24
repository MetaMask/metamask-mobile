import type { ControllerInitFunction } from '../../types';
import {
  RampsController,
  RampsControllerMessenger,
  getDefaultRampsControllerState,
} from '@metamask/ramps-controller';
import type { RampsControllerInitMessenger } from '../../messengers/ramps-controller-messenger';
import { hasMinimumRequiredVersion } from '../../../../components/UI/Ramp/utils/hasMinimumRequiredVersion';
import type { RampsUnifiedBuyV2Config } from '../../../../selectors/featureFlagController/ramps/rampsUnifiedBuyV2';

const RAMPS_UNIFIED_BUY_V2_FLAG_KEY = 'rampsUnifiedBuyV2';

/**
 * Determines whether the ramps unified buy V2 feature is enabled.
 * Checks build-time override first, then falls back to remote feature flag.
 *
 * @param initMessenger - The init messenger to read RemoteFeatureFlagController state.
 * @returns Whether V2 is enabled.
 */
function getIsRampsUnifiedBuyV2Enabled(
  initMessenger: RampsControllerInitMessenger,
): boolean {
  const buildFlag = process.env.MM_RAMPS_UNIFIED_BUY_V2_ENABLED;
  if (buildFlag === 'true' || buildFlag === 'false') {
    return buildFlag === 'true';
  }

  try {
    const remoteState = initMessenger.call(
      'RemoteFeatureFlagController:getState',
    );
    const config = (remoteState?.remoteFeatureFlags?.[
      RAMPS_UNIFIED_BUY_V2_FLAG_KEY
    ] ?? {}) as RampsUnifiedBuyV2Config;

    return hasMinimumRequiredVersion(
      config.minimumVersion,
      config.active ?? false,
    );
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
    // Initialize controller at app startup (non-blocking)
    // Defer to next tick to avoid affecting initial state snapshot
    Promise.resolve().then(() => {
      controller.init().catch(() => {
        // Initialization failed - error state will be available via selectors
      });
    });
  }

  return {
    controller,
  };
};
