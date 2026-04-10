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

/**
 * Initialize the PerpsController.
 *
 * @param request - The request object.
 * @returns The PerpsController.
 */
export const perpsControllerInit: MessengerClientInitFunction<
  PerpsController,
  PerpsControllerMessenger
> = (request) => {
  const { controllerMessenger, persistedState } = request;

  const perpsControllerState =
    persistedState.PerpsController ?? getDefaultPerpsControllerState();

  const messengerClient = new PerpsController({
    messenger: controllerMessenger,
    state: perpsControllerState,
    infrastructure: createMobileInfrastructure(),
    clientConfig: createMobileClientConfig(),
  });

  // Apply E2E mocks if configured via bridge
  applyE2EControllerMocks(messengerClient);

  return { messengerClient };
};
