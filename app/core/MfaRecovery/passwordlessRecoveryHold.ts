import type { Identifier } from '@metamask/mfa-recovery-controller';

/**
 * Ephemeral hold of the escrow Recovery Secret between Forgot-password MFA
 * (or AAL2-valid) and ChoosePassword submit.
 *
 * Why module scope: OAuthRehydration and ChoosePassword are different screens /
 * hook instances — a React ref cannot carry the secret across navigation.
 *
 * Security: never persisted; zeroed on take/clear/replace. Not logged.
 */

interface HeldRecovery {
  identifier: Identifier;
  recoverySecret: Uint8Array;
}

let held: HeldRecovery | null = null;

const wipe = (secret: Uint8Array | null | undefined): void => {
  secret?.fill(0);
};

/** Stores a freshly fetched Recovery Secret for the next ChoosePassword recover. */
export function setPasswordlessRecoveryHold(
  identifier: Identifier,
  recoverySecret: Uint8Array,
): void {
  clearPasswordlessRecoveryHold();
  held = { identifier, recoverySecret };
}

/**
 * Takes ownership of the hold (clears module state). Caller must zero
 * `recoverySecret` when finished (recoverWalletWithoutPassword does).
 */
export function takePasswordlessRecoveryHold(): HeldRecovery | null {
  const current = held;
  held = null;
  return current;
}

/** Drops a hold that will not be used (back navigation, failed navigate, etc.). */
export function clearPasswordlessRecoveryHold(): void {
  if (!held) {
    return;
  }
  wipe(held.recoverySecret);
  held = null;
}

export function hasPasswordlessRecoveryHold(): boolean {
  return held !== null;
}
