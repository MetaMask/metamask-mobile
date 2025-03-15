import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';

import { useSignIn } from './useSignIn';
import { selectIsUnlocked } from '../../../../selectors/keyringController';
import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';
import {
  selectIsProfileSyncingEnabled,
  selectIsSignedIn,
} from '../../../../selectors/identity';
import { selectIsMetamaskNotificationsEnabled } from '../../../../selectors/notifications';
import { selectCurrentOnboardingStep } from '../../../../selectors/wizard';
import { useMetrics } from '../../../../components/hooks/useMetrics';

/**
 * Custom hook to manage automatically signing in a user based on the app state.
 *
 * @returns An object containing:
 * - `autoSignIn`: A function to automatically sign in the user if necessary.
 * - `shouldAutoSignIn`: A boolean indicating whether the user should be automatically signed in.
 */
export function useAutoSignIn(): {
  autoSignIn: () => Promise<void>;
  shouldAutoSignIn: boolean;
} {
  const { signIn } = useSignIn();
  const { isEnabled } = useMetrics();

  // Base prerequisites
  const isUnlocked = Boolean(useSelector(selectIsUnlocked));
  const isBasicFunctionalityEnabled = Boolean(
    useSelector(selectBasicFunctionalityEnabled),
  );

  const completedOnboarding = useSelector(selectCurrentOnboardingStep) === 0;
  const isSignedIn = useSelector(selectIsSignedIn);

  const areBasePrerequisitesMet = useMemo(
    () =>
      !isSignedIn &&
      isUnlocked &&
      isBasicFunctionalityEnabled &&
      completedOnboarding,
    [isSignedIn, isUnlocked, isBasicFunctionalityEnabled, completedOnboarding],
  );

  // Auth dependent features
  // Since MetaMetrics is not a controller that extends BaseController,
  // and it is not stored in the redux store, we programmatically trigger `autoSignIn`
  // in the following file: app/components/Views/Settings/SecuritySettings/Sections/MetaMetricsAndDataCollectionSection/MetaMetricsAndDataCollectionSection.tsx
  const isProfileSyncingEnabled = useSelector(selectIsProfileSyncingEnabled);
  const isParticipateInMetaMetrics = isEnabled();
  const isNotificationServicesEnabled = useSelector(
    selectIsMetamaskNotificationsEnabled,
  );

  const isAtLeastOneAuthDependentFeatureEnabled = useMemo(
    () =>
      isProfileSyncingEnabled ||
      isParticipateInMetaMetrics ||
      isNotificationServicesEnabled,
    [
      isProfileSyncingEnabled,
      isParticipateInMetaMetrics,
      isNotificationServicesEnabled,
    ],
  );

  const shouldAutoSignIn = useMemo(
    () => areBasePrerequisitesMet && isAtLeastOneAuthDependentFeatureEnabled,
    [areBasePrerequisitesMet, isAtLeastOneAuthDependentFeatureEnabled],
  );

  const autoSignIn = useCallback(async () => {
    if (shouldAutoSignIn) {
      await signIn();
    }
  }, [shouldAutoSignIn, signIn]);

  return {
    autoSignIn,
    shouldAutoSignIn,
  };
}
