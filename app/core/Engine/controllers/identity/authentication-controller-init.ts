import { MessengerClientInitFunction } from '../../types';
import {
  Controller as AuthenticationController,
  type AuthenticationControllerMessenger,
} from '@metamask/profile-sync-controller/auth';
import { Platform } from '@metamask/profile-sync-controller/sdk';
import { getVersion } from 'react-native-device-info';
import { selectIsBasicFunctionalityConsolidationEnabled } from '../../../../selectors/featureFlagController/basicFunctionalityConsolidation';
import { selectMfaUiKitEnabled } from '../../../../selectors/featureFlagController/mfaUiKit';
import { authEnv } from '../../../apiEnv';
import { trace } from '../../../../util/trace';

/**
 * Initialize the authentication controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @param request.getState - Returns the current Redux root state.
 * @returns The initialized controller.
 */
export const authenticationControllerInit: MessengerClientInitFunction<
  AuthenticationController,
  AuthenticationControllerMessenger
> = ({ controllerMessenger, persistedState, analyticsId, getState }) => {
  const controller = new AuthenticationController({
    messenger: controllerMessenger,

    // @ts-expect-error: `AuthenticationController` does not accept partial state.
    state: persistedState.AuthenticationController,

    config: {
      env: authEnv(),
      // Locked social MFA (`exchangeSocialAccessToken`) needs the Google/Apple/
      // Telegram identifier paired to the profile. Pairing was BFTC-only; MFA
      // recovery also needs it or post-login passkey fails with Auth 404.
      isSocialPairingEnabled: () => {
        const state = getState();
        return (
          selectIsBasicFunctionalityConsolidationEnabled(state) ||
          selectMfaUiKitEnabled(state)
        );
      },
    },

    metametrics: {
      agent: Platform.MOBILE,
      getMetaMetricsId: async () => analyticsId ?? '',
      getAppVersion: () => getVersion(),
    },

    trace: trace as unknown as ConstructorParameters<
      typeof AuthenticationController
    >[0]['trace'],
  });

  return {
    controller,
  };
};
