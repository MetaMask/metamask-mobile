import { ControllerInitFunction } from '../../types';
import {
  Controller as AuthenticationController,
  type AuthenticationControllerMessenger,
} from '@metamask/profile-sync-controller/auth';
import { Platform } from '@metamask/profile-sync-controller/sdk';

/**
 * Initialize the authentication controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @returns The initialized controller.
 */
export const authenticationControllerInit: ControllerInitFunction<
  AuthenticationController,
  AuthenticationControllerMessenger
> = ({ controllerMessenger, persistedState, analyticsId }) => {
  const controller = new AuthenticationController({
    messenger: controllerMessenger,

    // @ts-expect-error: `AuthenticationController` does not accept partial state.
    state: persistedState.AuthenticationController,

    metametrics: {
      agent: Platform.MOBILE,
      getMetaMetricsId: async () => analyticsId ?? '',
    },
  });

  return {
    controller,
  };
};
