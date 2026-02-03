/**
 * Reveal private credential navigation parameters
 */

/** Reveal private credential parameters */
export interface RevealPrivateCredentialParams {
  credentialName?: 'seed_phrase' | 'private_key';
  shouldUpdateNav?: boolean;
  selectedAddress?: string;
}

/** Reveal SRP credential parameters */
export interface RevealSRPCredentialParams {
  keyringId?: string;
}

/** SRP reveal quiz parameters */
export interface SRPRevealQuizParams {
  onQuizComplete?: () => void;
}
