import type { MessengerClientInitFunction } from '../../types';
import {
  PerpsController,
  PerpsControllerMessenger,
  getDefaultPerpsControllerState,
} from '@metamask/perps-controller';
import { applyE2EControllerMocks } from '../../../../components/UI/Perps/utils/e2eBridgePerps';
import {
  createMobileInfrastructure,
  createMobileClientConfig,
} from '../../../../components/UI/Perps/adapters/mobileInfrastructure';
import { MOBILE_PRO_LAYOUT_DEFAULTS } from '../../../../components/UI/Perps/constants/perpsConfig';
import type { PerpsControllerInitMessenger } from '../../messengers/perps-controller-messenger';
import Logger from '../../../../util/Logger';

/**
 * Initialize the PerpsController.
 *
 * @param request - The request object.
 * @returns The PerpsController.
 */
export const perpsControllerInit: MessengerClientInitFunction<
  PerpsController,
  PerpsControllerMessenger,
  PerpsControllerInitMessenger
> = (request) => {
  const { controllerMessenger, initMessenger, persistedState } = request;

  const defaultState = getDefaultPerpsControllerState();
  const perpsControllerState = persistedState.PerpsController ?? {
    ...defaultState,
    proLayoutPreferences: {
      ...defaultState.proLayoutPreferences,
      ...MOBILE_PRO_LAYOUT_DEFAULTS,
    },
  };

  const controller = new PerpsController({
    messenger: controllerMessenger,
    state: perpsControllerState,
    infrastructure: createMobileInfrastructure(),
    clientConfig: createMobileClientConfig(),
  });

  // PerpsController stores eligibility and only re-checks it on construction
  // and on feature flag changes, so a new location (e.g. a VPN toggled while
  // the app is open) would otherwise keep the old geo-block result.
  initMessenger.subscribe(
    'GeolocationController:stateChange',
    () => {
      controller
        .refreshEligibility()
        .catch((error: unknown) =>
          Logger.log('Perps eligibility refresh failed: ', error),
        );
    },
    (geolocationState) => geolocationState.location,
  );

  // Apply E2E mocks if configured via bridge
  applyE2EControllerMocks(controller);

  return { controller };
};
