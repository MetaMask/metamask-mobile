import type {
  KeyringControllerState,
  KeyringObject,
} from '@metamask/keyring-controller';
import type { AuthenticationControllerState } from '@metamask/profile-sync-controller/auth';
import {
  PredictUserIdentityTracker,
  createPredictUserIdentitySource,
  resolvePredictUserIdentity,
  type PredictUserIdentity,
} from './predictUserIdentity';

const PRIMARY_SRP = 'srp-primary';
const SECOND_SRP = 'srp-secondary';

const keyring = (entropySourceId: string): KeyringObject =>
  ({
    type: 'HD Key Tree',
    accounts: ['0xabc'],
    metadata: { id: entropySourceId },
  }) as unknown as KeyringObject;

const unlockedKeyrings = (
  entropySourceIds: readonly string[] = [PRIMARY_SRP],
): KeyringControllerState =>
  ({
    isUnlocked: true,
    keyrings: entropySourceIds.map(keyring),
  }) as unknown as KeyringControllerState;

/** Mirrors `KeyringController.setLocked()`: the vault-backed keyrings are
 * emptied while the wallet is locked. */
const lockedKeyrings = (): KeyringControllerState =>
  ({ isUnlocked: false, keyrings: [] }) as unknown as KeyringControllerState;

const signedIn = ({
  [PRIMARY_SRP]: canonicalProfileId,
  ...sessions
}: Record<string, string | undefined>): AuthenticationControllerState =>
  ({
    isSignedIn: true,
    srpSessionData: Object.fromEntries(
      Object.entries({ [PRIMARY_SRP]: canonicalProfileId, ...sessions })
        .filter(([, profileId]) => Boolean(profileId))
        .map(([entropySourceId, profileId]) => [
          entropySourceId,
          { profile: { canonicalProfileId: profileId } },
        ]),
    ),
  }) as unknown as AuthenticationControllerState;

const signedOut = (): AuthenticationControllerState =>
  ({
    isSignedIn: false,
    srpSessionData: {},
  }) as unknown as AuthenticationControllerState;

/** `AuthenticationController#invalidateSrpSession`: the session entry survives,
 * its `canonicalProfileId` is blanked, and the next bearer-token request
 * re-logs in. */
const invalidatedSession = (entropySourceId: string = PRIMARY_SRP) =>
  ({
    isSignedIn: true,
    srpSessionData: {
      [entropySourceId]: { profile: { canonicalProfileId: '' } },
    },
  }) as unknown as AuthenticationControllerState;

describe('resolvePredictUserIdentity', () => {
  it('identifies the Predict User from the primary SRP session profile', () => {
    expect(
      resolvePredictUserIdentity(
        signedIn({ [PRIMARY_SRP]: 'profile-a' }),
        unlockedKeyrings(),
      ),
    ).toEqual({ kind: 'identified', canonicalProfileId: 'profile-a' });
  });

  it('reads the primary SRP, not another paired SRP', () => {
    expect(
      resolvePredictUserIdentity(
        signedIn({ [PRIMARY_SRP]: 'profile-a', [SECOND_SRP]: 'profile-b' }),
        unlockedKeyrings([PRIMARY_SRP, SECOND_SRP]),
      ),
    ).toEqual({ kind: 'identified', canonicalProfileId: 'profile-a' });
  });

  it('reports signed out when the primary SRP has no session', () => {
    expect(resolvePredictUserIdentity(signedOut(), unlockedKeyrings())).toEqual(
      { kind: 'signed-out' },
    );
    // A session left behind by another SRP does not identify the primary one.
    expect(
      resolvePredictUserIdentity(
        { ...signedIn({ [SECOND_SRP]: 'profile-b' }), isSignedIn: true },
        unlockedKeyrings(),
      ),
    ).toEqual({ kind: 'signed-out' });
  });

  it('reports unknown when the primary SRP session is being re-established', () => {
    // `invalidateSrpSession` keeps the entry and blanks the canonical profile,
    // so the same person is about to come back: not signed out.
    expect(
      resolvePredictUserIdentity(invalidatedSession(), unlockedKeyrings()),
    ).toEqual({ kind: 'unknown' });
    // A missing `srpSessionData` is what `performSignOut` leaves behind.
    expect(
      resolvePredictUserIdentity(
        {
          isSignedIn: false,
          srpSessionData: undefined,
        } as unknown as AuthenticationControllerState,
        unlockedKeyrings(),
      ),
    ).toEqual({ kind: 'signed-out' });
  });

  it('reports unknown while the wallet is locked, because keyrings are emptied', () => {
    expect(
      resolvePredictUserIdentity(
        signedIn({ [PRIMARY_SRP]: 'profile-a' }),
        lockedKeyrings(),
      ),
    ).toEqual({ kind: 'unknown' });
  });

  it('reports unknown when no keyring exists yet', () => {
    expect(
      resolvePredictUserIdentity(signedOut(), unlockedKeyrings([])),
    ).toEqual({ kind: 'unknown' });
  });
});

describe('PredictUserIdentityTracker', () => {
  const identity = (canonicalProfileId: string): PredictUserIdentity => ({
    kind: 'identified',
    canonicalProfileId,
  });
  const signedOutIdentity: PredictUserIdentity = { kind: 'signed-out' };
  const unknownIdentity: PredictUserIdentity = { kind: 'unknown' };

  it('does not report the first knowable identity as a change', () => {
    const tracker = new PredictUserIdentityTracker();

    expect(tracker.observe(identity('profile-a'))).toBe(false);
    expect(tracker.observe(identity('profile-a'))).toBe(false);
  });

  it('does not report lock/unlock as a change', () => {
    const tracker = new PredictUserIdentityTracker();
    tracker.observe(identity('profile-a'));

    // Lock empties the keyrings; unlock restores the same primary SRP.
    expect(tracker.observe(unknownIdentity)).toBe(false);
    expect(tracker.observe(identity('profile-a'))).toBe(false);
  });

  it('does not report an account switch or an added SRP as a change', () => {
    const tracker = new PredictUserIdentityTracker();
    tracker.observe(identity('profile-a'));

    // Switching wallet accounts and adding a second SRP leave the primary
    // SRP's session, and therefore the identity, untouched.
    expect(tracker.observe(identity('profile-a'))).toBe(false);
    expect(tracker.observe(identity('profile-a'))).toBe(false);
  });

  it('reports clearing the session as a change', () => {
    const tracker = new PredictUserIdentityTracker();
    tracker.observe(identity('profile-a'));

    expect(tracker.observe(signedOutIdentity)).toBe(true);
    expect(tracker.observe(signedOutIdentity)).toBe(false);
  });

  it('reports a new identity after a reset as a change', () => {
    const tracker = new PredictUserIdentityTracker();
    tracker.observe(identity('profile-a'));
    tracker.observe(signedOutIdentity);

    expect(tracker.observe(identity('profile-b'))).toBe(true);
  });

  it('reports a different canonical profile for the primary SRP as a change', () => {
    const tracker = new PredictUserIdentityTracker();
    tracker.observe(identity('profile-a'));

    expect(tracker.observe(identity('profile-b'))).toBe(true);
  });

  it('keeps the last known identity while the wallet is locked, so the next unlock is not a change', () => {
    const tracker = new PredictUserIdentityTracker();
    tracker.observe(identity('profile-a'));

    tracker.observe(unknownIdentity);
    tracker.observe(unknownIdentity);

    expect(tracker.observe(identity('profile-a'))).toBe(false);
  });

  it('does not report a session re-established for the same person as a change', () => {
    const tracker = new PredictUserIdentityTracker();
    tracker.observe(identity('profile-a'));

    // Invalidate, then re-login as the same canonical profile: MFA setup and
    // canonical-profile refreshes do this without the person changing.
    expect(tracker.observe(unknownIdentity)).toBe(false);
    expect(tracker.observe(identity('profile-a'))).toBe(false);
  });

  it('reports a different person when the re-established session resolves differently', () => {
    const tracker = new PredictUserIdentityTracker();
    tracker.observe(identity('profile-a'));

    expect(tracker.observe(unknownIdentity)).toBe(false);
    expect(tracker.observe(identity('profile-b'))).toBe(true);
  });
});

describe('createPredictUserIdentitySource', () => {
  it('reads both controller states and forwards the change subscription', () => {
    let authenticationState = signedIn({ [PRIMARY_SRP]: 'profile-a' });
    let keyringState = unlockedKeyrings();
    const unsubscribe = jest.fn();
    const subscribe = jest.fn((_onChange: () => void) => unsubscribe);

    const source = createPredictUserIdentitySource({
      getAuthenticationState: () => authenticationState,
      getKeyringState: () => keyringState,
      subscribe,
    });

    expect(source.current()).toEqual({
      kind: 'identified',
      canonicalProfileId: 'profile-a',
    });

    authenticationState = signedOut();
    keyringState = lockedKeyrings();
    expect(source.current()).toEqual({ kind: 'unknown' });

    const onChange = jest.fn();
    expect(source.subscribe(onChange)).toBe(unsubscribe);
    expect(subscribe).toHaveBeenCalledWith(onChange);
  });
});
