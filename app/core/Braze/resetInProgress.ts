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
 * Module-level (not Redux) because it is read synchronously from the Braze
 * hook's effect and must be set/cleared within the same tick as the temp
 * vault creation, without going through a dispatch.
 */
let resetInProgress = false;

export function setBrazeResetInProgress(value: boolean): void {
  resetInProgress = value;
}

export function isBrazeResetInProgress(): boolean {
  return resetInProgress;
}

/**
 * @internal Test helper only — do not use in production code.
 */
export function resetBrazeResetInProgressForTesting(): void {
  resetInProgress = false;
}
