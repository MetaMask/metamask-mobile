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

  const controller = new PerpsController({
    messenger: controllerMessenger,
    state: perpsControllerState,
    clientConfig: {
      fallbackBlockedRegions: process.env.MM_PERPS_BLOCKED_REGIONS?.split(','),
      fallbackEquityEnabled: process.env.MM_PERPS_HIP3_ENABLED === 'true',
      fallbackEnabledDexs:
        process.env.MM_PERPS_HIP3_ENABLED_DEXS?.split(',').filter(Boolean) ||
        [],
      // clientVersion: getVersion(),
      clientVersion: '7.60.0',
    },
  });

  // Apply E2E mocks if configured via bridge
  applyE2EControllerMocks(controller);

  return { controller };
};
