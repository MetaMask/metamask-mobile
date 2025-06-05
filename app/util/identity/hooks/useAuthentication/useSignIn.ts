import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectIsSignedIn } from '../../../../selectors/identity';
import { performSignIn } from '../../../../actions/identity';

/**
 * Custom hook to manage sign-in
 * Use this hook to manually sign in the user.
 * Any automatic sign-in should be handled by the `useIdentityEffects->useAutoSignIn` hook.
 *
 * This hook encapsulates the logic for initiating a sign-in process if the user is not already signed in
 * and at least one auth dependent feature is enabled. It needs the user to have basic functionality on.
 * It handles loading state and errors during the sign-in process.
 *
 * @returns An object containing:
 * - `signIn`: A function to initiate the sign-in process.
 */
export function useSignIn(): {
  signIn: (shouldSignInOverride?: boolean) => Promise<void>;
} {
  const isSignedIn = useSelector(selectIsSignedIn);

  const areBasePrerequisitesMet = useMemo(() => !isSignedIn, [isSignedIn]);

  const signIn = useCallback(
    async (shouldSignInOverride?: boolean) => {
      const shouldSignIn = shouldSignInOverride ?? areBasePrerequisitesMet;

      if (shouldSignIn) {
        try {
          await performSignIn();
        } catch (e) {
          // If an error occurs during the sign-in process, silently fail
        }
      }
    },
    [areBasePrerequisitesMet],
  );

  return {
    signIn,
  };
}
