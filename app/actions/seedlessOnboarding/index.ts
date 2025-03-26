import { getErrorMessage } from '@metamask/utils';
import Engine from '../../core/Engine';
import { AuthenticateUserParams } from '@metamask/seedless-onboarding-controller';


// /**
//  * Action to signal that app services are ready
//  */
// export function setAppServicesReady(): SetAppServicesReadyAction {
//     return {
//       type: UserActionType.SET_APP_SERVICES_READY,
//     };
//   }
// export function createAndBackupSeedPhrase(
//     password: string,
//     oAuthLoginInfo: {
//       verifier: OAuthProvider;
//       idToken: string;
//       verifierId: string;
//     },
//   ): ThunkAction<void, MetaMaskReduxState, unknown, AnyAction> {
//     return async (dispatch: MetaMaskReduxDispatch) => {
//     //   dispatch(showLoadingIndication());
  
//       try {
//         await createNewVault(password);
//         const seedPhrase = await getSeedPhrase(password);
//         const { verifier, idToken, verifierId } = oAuthLoginInfo;
//         await backupSeedPhrase(seedPhrase, password, idToken, verifier, verifierId);
//         return seedPhrase;
//       } catch (error) {
//         dispatch(displayWarning(error));
//         if (isErrorWithMessage(error)) {
//           throw new Error(getErrorMessage(error));
//         } else {
//           throw error;
//         }
//       } finally {
//         dispatch(hideLoadingIndication());
//       }
//     };
//   }

export const performeSeedlessOnboardingAuthenticate = async (authToken: AuthenticateUserParams) => {
    try {
        const result = await Engine.context.SeedlessOnboardingController.authenticateOAuthUser(authToken);
        return result;
    } catch (error) {
        return getErrorMessage(error);
    }
};

export const performSeedlessOnboardingCreate = async (params: {password: string, seedPhrase: string}) => {
    try {
        const result = await Engine.context.SeedlessOnboardingController.createSeedPhraseBackup(params);
        // if (!result) {
        //     return getErrorMessage(identityErrors.PERFORM_SIGN_IN);
        // }
        return result;
    } catch (error) {
        return getErrorMessage(error);
    }
};

export const performSeedlessOnboardingRehydrate = async (password: string) => {
    try {
        const result = await Engine.context.SeedlessOnboardingController.fetchAndRestoreSeedPhraseMetadata(password);
    //   if (!result) {
    //     return getErrorMessage(identityErrors.PERFORM_SIGN_IN);
    //   }
        return result;
    } catch (error) {
      return getErrorMessage(error);
    }
};
