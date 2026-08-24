import { MessengerClientInitFunction } from '../../types';
import {
  Controller as AuthenticationController,
  type AuthenticationControllerMessenger,
} from '@metamask/profile-sync-controller/auth';
import { Platform } from '@metamask/profile-sync-controller/sdk';
import { getVersion } from 'react-native-device-info';
import { authEnv } from '../../../devApiEnv';
import { sanitizePersistedAuthenticationState } from './sanitize-persisted-auth-state';

/**
 * Initialize the authentication controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @returns The initialized controller.
 */
export const authenticationControllerInit: MessengerClientInitFunction<
  AuthenticationController,
  AuthenticationControllerMessenger
> = ({ controllerMessenger, persistedState, analyticsId }) => {
  const env = authEnv();
  const controller = new AuthenticationController({
    messenger: controllerMessenger,

    // @ts-expect-error: `AuthenticationController` does not accept partial state.
    state: sanitizePersistedAuthenticationState(
      persistedState.AuthenticationController,
      env,
    ),

    config: { env },

    metametrics: {
      agent: Platform.MOBILE,
      getMetaMetricsId: async () => analyticsId ?? '',
      getAppVersion: () => getVersion(),
    },
  });

  return {
    controller,
  };
};
