import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';

import { useSignIn } from './useSignIn';
import {
  selectIsUnlocked,
  selectKeyrings,
} from '../../../../selectors/keyringController';
import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';
import { selectIsSignedIn } from '../../../../selectors/identity';
import { selectCompletedOnboarding } from '../../../../selectors/onboarding';

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
  setHasNewKeyrings: (hasNewKeyrings: boolean) => void;
} {
  const [hasNewKeyrings, setHasNewKeyrings] = useState(false);
  const { signIn } = useSignIn();

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

  const shouldAutoSignIn = useMemo(
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
    // Used in unit tests to simulate new keyrings being detected, should not be used in production code
    setHasNewKeyrings,
  };
}
