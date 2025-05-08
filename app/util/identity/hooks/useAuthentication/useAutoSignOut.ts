import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';

import { useSignOut } from './useSignOut';
import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';
import { selectIsSignedIn } from '../../../../selectors/identity';
import { selectIsUnlocked } from '../../../../selectors/keyringController';

/**
 * Custom hook to manage automatically signing out a user based on the app state.
 *
 * @returns An object containing:
 * - `autoSignOut`: A function to automatically sign out the user if necessary.
 * - `shouldAutoSignOut`: A boolean indicating whether the user should be automatically signed out.
 */
export function useAutoSignOut(): {
  autoSignOut: () => void;
  shouldAutoSignOut: boolean;
} {
  const { signOut } = useSignOut();

  // Base prerequisites
  const isUnlocked = Boolean(useSelector(selectIsUnlocked));
  const isBasicFunctionalityEnabled = Boolean(
    useSelector(selectBasicFunctionalityEnabled),
  );
  const isSignedIn = useSelector(selectIsSignedIn);

  const areBasePrerequisitesMet = useMemo(
    () => isSignedIn && isUnlocked && !isBasicFunctionalityEnabled,
    [isSignedIn, isUnlocked, isBasicFunctionalityEnabled],
  );

  const shouldAutoSignOut = useMemo(
    () => areBasePrerequisitesMet,
    [areBasePrerequisitesMet],
  );

  const autoSignOut = useCallback(() => {
    if (shouldAutoSignOut) {
      signOut();
    }
  }, [shouldAutoSignOut, signOut]);

  return {
    autoSignOut,
    shouldAutoSignOut,
  };
}
