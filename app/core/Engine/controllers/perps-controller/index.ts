import type { ControllerInitFunction } from '../../types';
import {
  PerpsController,
  PerpsControllerMessenger,
  getDefaultPerpsControllerState,
} from '../../../../components/UI/Perps/controllers';
import { applyE2EControllerMocks } from '../../../../components/UI/Perps/utils/e2eBridgePerps';

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
  const { controllerMessenger, persistedState } = request;

  const perpsControllerState =
    persistedState.PerpsController ?? getDefaultPerpsControllerState();

  // Pass fallback HIP-3 values from local env vars
  // PerpsController will try to read remote feature flags on construction
  // and subscribe to updates via RemoteFeatureFlagController:stateChange
  const controller = new PerpsController({
    messenger: controllerMessenger,
    state: perpsControllerState,
    clientConfig: {
      fallbackBlockedRegions: process.env.MM_PERPS_BLOCKED_REGIONS?.split(','),
      fallbackHip3Enabled: process.env.MM_PERPS_HIP3_ENABLED === 'true',
      fallbackHip3EnabledMarkets: process.env.MM_PERPS_HIP3_ENABLED_MARKETS
        ? process.env.MM_PERPS_HIP3_ENABLED_MARKETS.split(',')
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
        : [],
      fallbackHip3BlockedMarkets: process.env.MM_PERPS_HIP3_BLOCKED_MARKETS
        ? process.env.MM_PERPS_HIP3_BLOCKED_MARKETS.split(',')
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
        : [],
    },
  });

  // Apply E2E mocks if configured via bridge
  applyE2EControllerMocks(controller);

  return { controller };
};
