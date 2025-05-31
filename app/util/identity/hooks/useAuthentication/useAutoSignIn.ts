import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';

import { useSignIn } from './useSignIn';
import {
  selectIsUnlocked,
  selectKeyrings,
} from '../../../../selectors/keyringController';
import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';
import {
  selectIsBackupAndSyncEnabled,
  selectIsSignedIn,
} from '../../../../selectors/identity';
import { selectIsMetamaskNotificationsEnabled } from '../../../../selectors/notifications';
import { selectCompletedOnboarding } from '../../../../selectors/onboarding';
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
  const [hasNewKeyrings, setHasNewKeyrings] = useState(false);
  const { signIn } = useSignIn();
  const { isEnabled } = useMetrics();

  // Base prerequisites
  const isUnlocked = Boolean(useSelector(selectIsUnlocked));
  const isBasicFunctionalityEnabled = Boolean(
    useSelector(selectBasicFunctionalityEnabled),
  );

  const completedOnboarding = useSelector(selectCompletedOnboarding);
  const isSignedIn = useSelector(selectIsSignedIn);

  const keyrings = useSelector(selectKeyrings);
  const previousKeyringsLength = useRef(keyrings.length);

  useEffect(() => {
    if (keyrings.length !== previousKeyringsLength.current) {
      previousKeyringsLength.current = keyrings.length;
      setHasNewKeyrings(true);
    }
  }, [keyrings.length]);

  const areBasePrerequisitesMet = useMemo(
    () =>
      (!isSignedIn || hasNewKeyrings) &&
      isUnlocked &&
      isBasicFunctionalityEnabled &&
      completedOnboarding,
    [
      isSignedIn,
      isUnlocked,
      isBasicFunctionalityEnabled,
      completedOnboarding,
      hasNewKeyrings,
    ],
  );

  // Auth dependent features
  // Since MetaMetrics is not a controller that extends BaseController,
  // and it is not stored in the redux store, we programmatically trigger `autoSignIn`
  // in the following file: app/components/Views/Settings/SecuritySettings/Sections/MetaMetricsAndDataCollectionSection/MetaMetricsAndDataCollectionSection.tsx
  const isBackupAndSyncEnabled = useSelector(selectIsBackupAndSyncEnabled);
  const isParticipateInMetaMetrics = isEnabled();
  const isNotificationServicesEnabled = useSelector(
    selectIsMetamaskNotificationsEnabled,
  );

  const isAtLeastOneAuthDependentFeatureEnabled = useMemo(
    () =>
      isBackupAndSyncEnabled ||
      isParticipateInMetaMetrics ||
      isNotificationServicesEnabled,
    [
      isBackupAndSyncEnabled,
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
      if (hasNewKeyrings) {
        await signIn(true);
        setHasNewKeyrings(false);
      }
      await signIn();
    }
  }, [shouldAutoSignIn, signIn, hasNewKeyrings]);

  return {
    autoSignIn,
    shouldAutoSignIn,
  };
}
