import type { ControllerInitFunction } from '../../types';
import {
  PerpsController,
  PerpsControllerMessenger,
  getDefaultPerpsControllerState,
} from '../../../../components/UI/Perps/controllers';
import { applyE2EControllerMocks } from '../../../../components/UI/Perps/utils/e2eBridgePerps';
import {
  selectPerpsEquityEnabledFlag,
  selectPerpsEnabledDexs,
} from '../../../../components/UI/Perps/selectors/featureFlags';
import { selectRemoteFeatureFlags } from '../../../../selectors/featureFlagController';

/**
 * Initialize the PerpsController.
 *
 * @param request - The request object.
 * @returns The PerpsController.
 */
export const perpsControllerInit: ControllerInitFunction<
  PerpsController,
  PerpsControllerMessenger
> = (request) => {
  const { controllerMessenger, persistedState, getState } = request;

  const perpsControllerState =
    persistedState.PerpsController ?? getDefaultPerpsControllerState();

  // Get HIP-3 feature flags from selector (with local fallbacks)
  const state = getState();
  const remoteFeatureFlags = selectRemoteFeatureFlags(state);
  const equityEnabled =
    selectPerpsEquityEnabledFlag.resultFunc(remoteFeatureFlags);
  const enabledDexs = selectPerpsEnabledDexs.resultFunc(remoteFeatureFlags);

  const controller = new PerpsController({
    messenger: controllerMessenger,
    state: perpsControllerState,
    clientConfig: {
      fallbackBlockedRegions: process.env.MM_PERPS_BLOCKED_REGIONS?.split(','),
      equityEnabled,
      enabledDexs,
    },
  });

  // Apply E2E mocks if configured via bridge
  applyE2EControllerMocks(controller);

  return { controller };
};
