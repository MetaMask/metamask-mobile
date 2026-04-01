/**
 * Reveal private credential navigation parameters
 */

import type { InternalAccount } from '@metamask/keyring-internal-api';

/** Reveal private credential parameters */
export interface RevealPrivateCredentialParams {
  shouldUpdateNav?: boolean;
  selectedAccount?: InternalAccount;
  keyringId?: string;
  /** When true, skip quiz and show password/action view (e.g. when coming from SRPQuiz modal) */
  skipQuiz?: boolean;
  /**
   * When true, Done pops to the first screen in the current stack (e.g. wallet home),
   * dismissing all overlays (e.g. Accounts sheet, Wallet Details, etc.). Use when returning to home.
   */
  popToTopOnDone?: boolean;
  /**
   * When true, Done calls `pop(2)` to dismiss both RevealPrivateCredential and the
   * underlying `ROOT_MODAL_FLOW` (e.g. Select SRP + quiz). Does not apply to Cancel — user
   * still returns to the quiz with a single pop.
   */
  dismissModalStackOnDone?: boolean;
}

/** Reveal SRP credential parameters */
export interface RevealSRPCredentialParams {
  keyringId?: string;
}

/** SRP reveal quiz parameters */
export interface SRPRevealQuizParams {
  onQuizComplete?: () => void;
}
