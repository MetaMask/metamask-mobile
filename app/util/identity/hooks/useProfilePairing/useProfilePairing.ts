import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { ProfilePairingStatus } from '@metamask/seedless-onboarding-controller';

import Engine from '../../../../core/Engine';
import Logger from '../../../Logger';
import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';
import { selectCompletedOnboarding } from '../../../../selectors/onboarding';
import { selectIsUnlocked } from '../../../../selectors/keyringController';
import { selectIsSignedIn } from '../../../../selectors/identity';
import {
  selectProfilePairingStatus,
  selectProfilePairingToken,
} from '../../../../selectors/seedlessOnboardingController';

export const useShouldPairProfile = () => {
  const isUnlocked = useSelector(selectIsUnlocked);
  const isSignedIn = useSelector(selectIsSignedIn);
  const completedOnboarding = useSelector(selectCompletedOnboarding);
  const basicFunctionality = useSelector(selectBasicFunctionalityEnabled);
  const pairingStatus = useSelector(selectProfilePairingStatus);
  const profilePairingToken = useSelector(selectProfilePairingToken);

  return Boolean(
    isUnlocked &&
      isSignedIn &&
      completedOnboarding &&
      basicFunctionality &&
      profilePairingToken &&
      pairingStatus !== ProfilePairingStatus.Paired,
  );
};

export const useProfilePairing = () => {
  const shouldPairProfile = useShouldPairProfile();

  const dispatchProfilePairing = useCallback(() => {
    const action = async () => {
      if (!shouldPairProfile) {
        return;
      }
      // eslint-disable-next-line no-console
      console.log('[PAIR-DEBUG] starting profile pairing');
      try {
        const srpToken = (await Engine.controllerMessenger.call(
          'AuthenticationController:getBearerToken',
        )) as string;
        await Engine.context.SeedlessOnboardingController.pairProfileServiceWithSocialLogin(
          srpToken,
        );
        // eslint-disable-next-line no-console
        console.log('[PAIR-DEBUG] profile pairing complete');
      } catch (error) {
        Logger.error(error as Error, 'profile pairing failed');
      }
    };
    action();
  }, [shouldPairProfile]);

  return {
    dispatchProfilePairing,
    shouldPairProfile,
  };
};
