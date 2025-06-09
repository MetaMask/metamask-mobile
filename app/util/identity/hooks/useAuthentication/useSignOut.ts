import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectIsSignedIn } from '../../../../selectors/identity';
import { performSignOut } from '../../../../actions/identity';

/**
 * Custom hook to manage sign-out
 *
 * Use this hook to manually sign out the user.
 * Any automatic sign-out should be handled by the `useIdentityEffects->useAutoSignOut` hook.
 * IMPORTANT: nothing other than basic functionality being turned off should trigger a sign out.
 * The only exception being when deleting the wallet.
 *
 * This hook encapsulates the logic for initiating a sign-out process if the user is signed in.
 * It handles loading state and errors during the sign-out process.
 *
 * @returns An object containing:
 * - `signOut`: A function to initiate the sign-out process.
 */
export function useSignOut(): {
  signOut: () => void;
} {
  const isSignedIn = useSelector(selectIsSignedIn);

  const shouldSignOut = useMemo(() => Boolean(isSignedIn), [isSignedIn]);

  const signOut = useCallback(() => {
    if (shouldSignOut) {
      try {
        performSignOut();
      } catch (e) {
        // If an error occurs during the sign-out process, silently fail
      }
    }
  }, [shouldSignOut]);

  return {
    signOut,
  };
}
