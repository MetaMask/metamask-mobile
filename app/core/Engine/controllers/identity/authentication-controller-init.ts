import { MessengerClientInitFunction } from '../../types';
import {
  Controller as AuthenticationController,
  type AuthenticationControllerMessenger,
} from '@metamask/profile-sync-controller/auth';
import { Platform } from '@metamask/profile-sync-controller/sdk';
import { getVersion } from 'react-native-device-info';
import { authEnv } from '../../../devApiEnv';

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
  const controller = new AuthenticationController({
    messenger: controllerMessenger,

    // @ts-expect-error: `AuthenticationController` does not accept partial state.
    state: persistedState.AuthenticationController,

    config: { env: authEnv() },

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
