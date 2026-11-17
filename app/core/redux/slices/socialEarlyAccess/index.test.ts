import ExtendedKeyringTypes from '../../../../constants/keyringTypes';
import reducer, {
  clearSocialEarlyAccess,
  initialState,
  selectHasSocialEarlyAccess,
  selectSocialEarlyAccessProfileId,
  setSocialEarlyAccess,
  SocialEarlyAccessSliceState,
} from '.';
import { RootState } from '../../../../reducers';

interface BuildStateOptions {
  socialEarlyAccess?: SocialEarlyAccessSliceState;
  isSignedIn?: boolean;
  canonicalProfileId?: string;
  sessionProfileId?: string;
  hasKeyring?: boolean;
}

const buildState = ({
  socialEarlyAccess,
  isSignedIn = true,
  canonicalProfileId,
  sessionProfileId,
  hasKeyring = true,
}: BuildStateOptions): RootState =>
  ({
    socialEarlyAccess,
    engine: {
      backgroundState: {
        AuthenticationController: {
          isSignedIn,
          srpSessionData: {
            'hd-1': {
              profile: {
                canonicalProfileId,
                profileId: sessionProfileId,
              },
            },
          },
        },
        KeyringController: {
          keyrings: hasKeyring
            ? [
                {
                  type: ExtendedKeyringTypes.hd,
                  accounts: [],
                  metadata: { id: 'hd-1', name: '' },
                },
              ]
            : [],
        },
      },
    },
  }) as unknown as RootState;

describe('socialEarlyAccess slice', () => {
  it('returns the initial state', () => {
    const state = reducer(undefined, { type: 'unknown' });

    expect(state).toStrictEqual(initialState);
  });

  it('stores the early-access answer for a profile', () => {
    const state = reducer(
      initialState,
      setSocialEarlyAccess({ profileId: 'profile-1', hasAccess: true }),
    );

    expect(state).toStrictEqual({ profileId: 'profile-1', hasAccess: true });
  });

  it('resets to the initial state on clear', () => {
    const state = reducer(
      { profileId: 'profile-1', hasAccess: true },
      clearSocialEarlyAccess(),
    );

    expect(state).toStrictEqual(initialState);
  });
});

describe('selectHasSocialEarlyAccess', () => {
  it('returns true when signed in and the stored profile matches the canonical profile', () => {
    const state = buildState({
      socialEarlyAccess: { profileId: 'profile-a', hasAccess: true },
      isSignedIn: true,
      canonicalProfileId: 'profile-a',
      sessionProfileId: 'session-a',
    });

    const result = selectHasSocialEarlyAccess(state);

    expect(result).toBe(true);
  });

  it('returns true when signed in and the stored profile matches the session profile while canonical is absent', () => {
    const state = buildState({
      socialEarlyAccess: { profileId: 'session-a', hasAccess: true },
      isSignedIn: true,
      canonicalProfileId: undefined,
      sessionProfileId: 'session-a',
    });

    const result = selectHasSocialEarlyAccess(state);

    expect(result).toBe(true);
  });

  it('returns false when signed in to the matching profile with hasAccess false', () => {
    const state = buildState({
      socialEarlyAccess: { profileId: 'profile-a', hasAccess: false },
      isSignedIn: true,
      canonicalProfileId: 'profile-a',
    });

    const result = selectHasSocialEarlyAccess(state);

    expect(result).toBe(false);
  });

  it('returns false on cold-start sign-out even when a grant is persisted', () => {
    const state = buildState({
      socialEarlyAccess: { profileId: 'profile-a', hasAccess: true },
      isSignedIn: false,
      canonicalProfileId: 'profile-a',
    });

    const result = selectHasSocialEarlyAccess(state);

    expect(result).toBe(false);
  });

  it('returns false when identity is pending even when signed in with a persisted grant', () => {
    const state = buildState({
      socialEarlyAccess: { profileId: 'profile-a', hasAccess: true },
      isSignedIn: true,
      hasKeyring: false,
    });

    const result = selectHasSocialEarlyAccess(state);

    expect(result).toBe(false);
  });

  it('returns false when signed into a different profile than the persisted grant', () => {
    const state = buildState({
      socialEarlyAccess: { profileId: 'profile-a', hasAccess: true },
      isSignedIn: true,
      canonicalProfileId: 'profile-b',
      sessionProfileId: 'session-b',
    });

    const result = selectHasSocialEarlyAccess(state);

    expect(result).toBe(false);
  });

  it('returns false when the slice is missing from state', () => {
    const state = buildState({
      socialEarlyAccess: undefined,
      isSignedIn: true,
      canonicalProfileId: 'profile-a',
    });

    const result = selectHasSocialEarlyAccess(state);

    expect(result).toBe(false);
  });
});

describe('selectSocialEarlyAccessProfileId', () => {
  it('returns the profile the stored answer belongs to', () => {
    const state = buildState({
      socialEarlyAccess: { profileId: 'profile-1', hasAccess: true },
    });

    const result = selectSocialEarlyAccessProfileId(state);

    expect(result).toBe('profile-1');
  });

  it('returns null when the slice is missing from state', () => {
    const state = buildState({ socialEarlyAccess: undefined });

    const result = selectSocialEarlyAccessProfileId(state);

    expect(result).toBeNull();
  });
});
