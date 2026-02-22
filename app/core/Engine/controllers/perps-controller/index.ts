import type { ControllerInitFunction } from '../../types';
import {
  PerpsController,
  PerpsControllerMessenger,
  getDefaultPerpsControllerState,
} from '../../../../components/UI/Perps/controllers';
import { applyE2EControllerMocks } from '../../../../components/UI/Perps/utils/e2eBridgePerps';
import { parseCommaSeparatedString } from '../../../../components/UI/Perps/utils/stringParseUtils';
import { createMobileInfrastructure } from '../../../../components/UI/Perps/adapters/mobileInfrastructure';

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
    infrastructure: createMobileInfrastructure(),
    clientConfig: {
      fallbackBlockedRegions: parseCommaSeparatedString(
        process.env.MM_PERPS_BLOCKED_REGIONS ?? '',
      ),
      fallbackHip3Enabled: process.env.MM_PERPS_HIP3_ENABLED === 'true',
      fallbackHip3AllowlistMarkets: parseCommaSeparatedString(
        process.env.MM_PERPS_HIP3_ALLOWLIST_MARKETS ?? '',
      ),
      fallbackHip3BlocklistMarkets: parseCommaSeparatedString(
        process.env.MM_PERPS_HIP3_BLOCKLIST_MARKETS ?? '',
      ),
    },
  });

  // Apply E2E mocks if configured via bridge
  applyE2EControllerMocks(controller);

  return { controller };
};
