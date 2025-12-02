import { ControllerInitFunction } from '../../types';
import {
  Controller as AuthenticationController,
  type AuthenticationControllerMessenger,
} from '@metamask/profile-sync-controller/auth';
import { Platform } from '@metamask/profile-sync-controller/sdk';
import { AuthenticationControllerInitMessenger } from '../../messengers/identity/authentication-controller-messenger';
import { selectAnalyticsId } from '../../../../selectors/analyticsController';

/**
 * Initialize the authentication controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @returns The initialized controller.
 */
export const authenticationControllerInit: ControllerInitFunction<
  AuthenticationController,
  AuthenticationControllerMessenger,
  AuthenticationControllerInitMessenger
> = ({ controllerMessenger, persistedState, getState }) => {
  const controller = new AuthenticationController({
    messenger: controllerMessenger,

    // @ts-expect-error: `AuthenticationController` does not accept partial state.
    state: persistedState.AuthenticationController,

    metametrics: {
      agent: Platform.MOBILE,
      getMetaMetricsId: async () => selectAnalyticsId(getState()) ?? '',
    },
  });

  return {
    controller,
  };
};
