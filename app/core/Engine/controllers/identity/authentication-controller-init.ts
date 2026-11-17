import { MessengerClientInitFunction } from '../../types';
import {
  Controller as AuthenticationController,
  type AuthenticationControllerMessenger,
} from '@metamask/profile-sync-controller/auth';
import { Platform } from '@metamask/profile-sync-controller/sdk';
import { getVersion } from 'react-native-device-info';
import { selectIsBasicFunctionalityConsolidationEnabled } from '../../../../selectors/featureFlagController/basicFunctionalityConsolidation';
import { selectMfaRecoveryEnabled } from '../../../../selectors/featureFlagController/mfaRecovery';
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
      // Telegram identifier paired to the profile. Pair when BFTC, the MFA UI
      // kit, or mfaRecovery is on. Recovery with the UI kit off otherwise 404s
      // and cannot start.
      isSocialPairingEnabled: () => {
        const state = getState();
        return (
          selectIsBasicFunctionalityConsolidationEnabled(state) ||
          selectMfaUiKitEnabled(state) ||
          selectMfaRecoveryEnabled(state)
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
