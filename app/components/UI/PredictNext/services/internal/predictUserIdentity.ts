import {
  selectPrimaryHdKeyringEntropySourceId,
  type KeyringControllerState,
} from '@metamask/keyring-controller';
import type { AuthenticationControllerState } from '@metamask/profile-sync-controller/auth';

/**
 * Who the current Predict User is, as far as the account caches can tell.
 *
 * The identity value is the canonical profile of the session belonging to the
 * primary SRP — the same value the backend derives from the bearer token. It
 * is compared in memory only and never logged, traced, keyed, persisted, or
 * published.
 */
export type PredictUserIdentity =
  | { readonly kind: 'identified'; readonly canonicalProfileId: string }
  /** No session for the primary SRP: signed out, or a wallet without one. */
  | { readonly kind: 'signed-out' }
  /**
   * Not knowable right now: the wallet is locked and its keyrings are emptied,
   * or no keyrings exist yet. Callers keep the last known identity, so
   * lock/unlock stays a no-op.
   */
  | { readonly kind: 'unknown' };

/**
 * Resolves the Predict User from the same state the backend's identity comes
 * from: the primary HD keyring's `metadata.id` and that keyring's SRP session.
 *
 * Mirrors `selectCanonicalProfileId`: keying by the primary keyring keeps a
 * session left behind by a reset-away wallet from being read as the live one.
 *
 * @param authentication - AuthenticationController state.
 * @param keyring - KeyringController state.
 * @returns The current identity, or that it is unknown.
 */
export const resolvePredictUserIdentity = (
  authentication: AuthenticationControllerState,
  keyring: KeyringControllerState,
): PredictUserIdentity => {
  const entropySourceId = selectPrimaryHdKeyringEntropySourceId(keyring);
  if (!entropySourceId) {
    return { kind: 'unknown' };
  }

  const canonicalProfileId =
    authentication.srpSessionData?.[entropySourceId]?.profile
      ?.canonicalProfileId;
  return canonicalProfileId
    ? { kind: 'identified', canonicalProfileId }
    : { kind: 'signed-out' };
};

const isSamePredictUser = (
  previous: PredictUserIdentity,
  next: PredictUserIdentity,
): boolean => {
  if (previous.kind === 'identified' && next.kind === 'identified') {
    return previous.canonicalProfileId === next.canonicalProfileId;
  }
  return previous.kind === next.kind;
};

/**
 * Remembers the last knowable Predict User and reports when it changed.
 *
 * The first knowable identity establishes the baseline without counting as a
 * change, so app start and unlock never purge. After that, any transition
 * between knowable identities is a change: A to signed-out, signed-out to B,
 * and A to B. Lock/unlock is not, because a locked wallet reports `unknown`
 * and leaves the remembered identity alone.
 */
export class PredictUserIdentityTracker {
  #lastKnown: PredictUserIdentity | undefined;

  /**
   * Records one observation.
   *
   * @param next - The identity observed right now.
   * @returns Whether the Predict User changed, which means cached account
   * data belongs to somebody else.
   */
  observe(next: PredictUserIdentity): boolean {
    if (next.kind === 'unknown') {
      return false;
    }

    const previous = this.#lastKnown;
    this.#lastKnown = next;
    return previous ? !isSamePredictUser(previous, next) : false;
  }
}

/** Where the account caches read the current Predict User from, and how they
 * learn it may have changed. */
export interface PredictUserIdentitySource {
  /** Reads the identity from controller state now. */
  readonly current: () => PredictUserIdentity;
  /**
   * Calls `onChange` whenever authentication or keyring state changes.
   *
   * @param onChange - Called on every candidate change; the caller re-resolves
   * the identity and decides whether it actually changed.
   * @returns Unsubscribes.
   */
  readonly subscribe: (onChange: () => void) => () => void;
}

export interface PredictUserIdentitySourceOptions {
  readonly getAuthenticationState: () => AuthenticationControllerState;
  readonly getKeyringState: () => KeyringControllerState;
  readonly subscribe: (onChange: () => void) => () => void;
}

/**
 * Builds a {@link PredictUserIdentitySource} from controller-state reads and a
 * change subscription, so the composition root owns the messenger wiring.
 *
 * @param options - State readers and the change subscription.
 * @returns The identity source.
 */
export const createPredictUserIdentitySource = ({
  getAuthenticationState,
  getKeyringState,
  subscribe,
}: PredictUserIdentitySourceOptions): PredictUserIdentitySource => ({
  current: () =>
    resolvePredictUserIdentity(getAuthenticationState(), getKeyringState()),
  subscribe,
});
