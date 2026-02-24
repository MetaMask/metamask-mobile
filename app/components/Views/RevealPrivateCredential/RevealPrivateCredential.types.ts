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
}

/** Reveal SRP credential parameters */
export interface RevealSRPCredentialParams {
  keyringId?: string;
}

/** SRP reveal quiz parameters */
export interface SRPRevealQuizParams {
  onQuizComplete?: () => void;
}
