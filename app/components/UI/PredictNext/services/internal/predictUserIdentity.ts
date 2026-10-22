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
  /** No session at all for the primary SRP: signed out, a wallet reset, or a
   * wallet that never had one. */
  | { readonly kind: 'signed-out' }
  /**
   * Not knowable right now, so callers keep the last known identity and stay
   * a no-op: the wallet is locked and its keyrings are emptied; no keyrings
   * exist yet; or the primary SRP's session entry is present but its canonical
   * profile is blanked while the same person's session is re-established.
   */
  | { readonly kind: 'unknown' };

/**
 * Resolves the Predict User from the same state the backend's identity comes
 * from: the primary HD keyring's `metadata.id` and that keyring's SRP session.
 *
 * Mirrors `selectCanonicalProfileId`: keying by the primary keyring keeps a
 * session left behind by a reset-away wallet from being read as the live one.
 *
 * A present session entry with no canonical profile is not a signed-out
 * wallet. `AuthenticationController#invalidateSrpSession` blanks
 * `canonicalProfileId` and keeps the entry, and the next bearer-token request
 * re-logs in and usually resolves to the same person. Treating that gap as
 * signed-out would purge on the way out and again on the way back, and would
 * abandon in-flight Order Commits of a person who never changed. So that case
 * is unknown, and only a missing entry — what `performSignOut` and
 * `clearState` leave behind — is signed out. If the re-login resolves a
 * different canonical profile, the tracker still observes A then B and purges.
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

  const session = authentication.srpSessionData?.[entropySourceId];
  if (!session) {
    return { kind: 'signed-out' };
  }

  const canonicalProfileId = session.profile?.canonicalProfileId;
  if (!canonicalProfileId) {
    // The session exists but its identity is being re-established.
    return { kind: 'unknown' };
  }

  return { kind: 'identified', canonicalProfileId };
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
 * and A to B. Lock/unlock is not, and neither is a session being re-established
 * for the same person, because both report `unknown` and leave the remembered
 * identity alone.
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
