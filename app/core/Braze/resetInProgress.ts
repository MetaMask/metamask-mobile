/**
 * In-memory flag marking that a wallet reset is creating its throwaway vault.
 *
 * While set, Braze identity sync must not react to the temporary sign-in: the
 * vault is discarded milliseconds later, so letting `useBrazeIdentity` run its
 * sign-in branch would fire a `changeUser` (session start + identify) and a
 * banner refresh for a wallet that never reaches the user — a burst of Braze
 * requests that is pure noise. Sign-out (`clearBrazeUser`) is intentionally
 * left ungated so the previous user's session-end event is preserved.
 *
 * The flag is held for the whole reset, not just the vault creation: the
 * throwaway vault is signed in by `useAutoSignIn` from a React effect on a
 * later tick (after `dispatchLogin`), so clearing the flag as soon as the
 * vault promise resolves would let that deferred effect slip through. It is
 * cleared only after the app is locked.
 *
 * Module-level (not Redux) because it is read synchronously from the Braze
 * hook's effect and must be set/cleared without going through a dispatch.
 */
let resetInProgress = false;

export function setBrazeResetInProgress(value: boolean): void {
  resetInProgress = value;
}

export function isBrazeResetInProgress(): boolean {
  return resetInProgress;
}
