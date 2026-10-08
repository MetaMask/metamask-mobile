import {
  selectProfileControllerState,
  selectProfile,
  selectXProfile,
  selectIsConnectedToX,
} from './profileController';
import { RootState } from '../reducers';
import { getDefaultProfileControllerState } from '@metamask/profile-controller';
import ExtendedKeyringTypes from '../constants/keyringTypes';

/**
 * An authenticated session for the primary SRP: wires the keyring
 * `metadata.id` that `selectCanonicalProfileId` uses to look up
 * `srpSessionData` with a canonical profile id.
 */
interface AuthSession {
  keyringId: string;
  canonicalProfileId: string;
}

function buildState(
  profileControllerState?: Record<string, unknown> | null,
  authSession?: AuthSession,
): RootState {
  return {
    engine: {
      backgroundState: {
        ProfileController: profileControllerState,
        // `selectCanonicalProfileId` resolves through these two slices; keep
        // safe defaults so it returns undefined (unknown identity) unless a
        // session is provided.
        AuthenticationController: {
          isSignedIn: true,
          srpSessionData: authSession
            ? {
                [authSession.keyringId]: {
                  profile: {
                    canonicalProfileId: authSession.canonicalProfileId,
                  },
                },
              }
            : {},
        },
        KeyringController: {
          isUnlocked: true,
          keyrings: authSession
            ? [
                {
                  type: ExtendedKeyringTypes.hd,
                  accounts: [],
                  metadata: { id: authSession.keyringId, name: '' },
                },
              ]
            : [],
        },
      },
    },
  } as unknown as RootState;
}

const COMPLETE_PROFILE = {
  profileId: 'profile-1',
  username: 'tester',
  displayName: 'Tester',
  bio: 'bio',
  linkedAddresses: [],
  avatarUrl: 'https://example.com/avatar.png',
  tradingPrivacy: 'public' as const,
  connectedToX: false,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const X_PROFILE = {
  xUserId: 'x-user-1',
  xProfileUrl: 'https://x.com/tester',
  username: 'tester',
  displayName: 'Tester',
  avatarUrl: 'https://example.com/x.png',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('profileController selectors', () => {
  describe('selectProfileControllerState', () => {
    it('returns the controller state when present', () => {
      const state = buildState({ profile: COMPLETE_PROFILE });
      expect(selectProfileControllerState(state).profile).toEqual(
        COMPLETE_PROFILE,
      );
    });

    it('returns the default state when the controller state is absent', () => {
      expect(selectProfileControllerState(buildState(null))).toEqual(
        getDefaultProfileControllerState(),
      );
    });
  });

  describe('selectProfile', () => {
    it('returns the profile when a profileId exists', () => {
      const state = buildState({
        profile: COMPLETE_PROFILE,
      });
      expect(selectProfile(state)).toEqual(COMPLETE_PROFILE);
    });

    it('returns undefined when no profile has been created (empty profileId)', () => {
      const state = buildState({
        profile: getDefaultProfileControllerState().profile,
      });
      expect(selectProfile(state)).toBeUndefined();
    });

    it('returns the profile when the canonical profile id is unknown (no session)', () => {
      // No auth session: the wallet is signed out/locked, so the guard must
      // not hide the profile just because the identity cannot be resolved.
      const state = buildState({
        profile: COMPLETE_PROFILE,
      });
      expect(selectProfile(state)).toEqual(COMPLETE_PROFILE);
    });

    it('returns the profile when the stored profileId matches the canonical profile id', () => {
      const state = buildState(
        { profile: { ...COMPLETE_PROFILE, profileId: 'canonical-profile-1' } },
        { keyringId: 'entropy-1', canonicalProfileId: 'canonical-profile-1' },
      );
      expect(selectProfile(state)).toEqual({
        ...COMPLETE_PROFILE,
        profileId: 'canonical-profile-1',
      });
    });

    it('returns undefined when the stored profile belongs to a different canonical profile id', () => {
      const state = buildState(
        { profile: { ...COMPLETE_PROFILE, profileId: 'stale-profile-id' } },
        { keyringId: 'entropy-1', canonicalProfileId: 'current-profile-id' },
      );
      expect(selectProfile(state)).toBeUndefined();
    });
  });

  describe('selectXProfile', () => {
    it('returns the linked X profile when present', () => {
      const state = buildState({
        profile: COMPLETE_PROFILE,
        xProfile: X_PROFILE,
      });
      expect(selectXProfile(state)).toEqual(X_PROFILE);
    });

    it('returns undefined when no X profile is linked', () => {
      const state = buildState({ profile: COMPLETE_PROFILE });
      expect(selectXProfile(state)).toBeUndefined();
    });
  });

  describe('selectIsConnectedToX', () => {
    it('returns true when an X profile is linked', () => {
      const state = buildState({
        profile: { ...COMPLETE_PROFILE, connectedToX: false },
        xProfile: X_PROFILE,
      });
      expect(selectIsConnectedToX(state)).toBe(true);
    });

    it('returns true when the profile reports connectedToX without a stored X profile', () => {
      const state = buildState({
        profile: { ...COMPLETE_PROFILE, connectedToX: true },
      });
      expect(selectIsConnectedToX(state)).toBe(true);
    });

    it('returns false when X is not connected', () => {
      const state = buildState({
        profile: { ...COMPLETE_PROFILE, connectedToX: false },
      });
      expect(selectIsConnectedToX(state)).toBe(false);
    });

    it('returns false for the default (no profile) state', () => {
      expect(selectIsConnectedToX(buildState(null))).toBe(false);
    });

    it('returns false when the stored profile reports connectedToX but belongs to a different canonical profile id', () => {
      // Device bug regression: a persisted profile from another session keeps
      // connectedToX true because ProfileController only clears X fields for
      // the matching profile id.
      const state = buildState(
        {
          profile: {
            ...COMPLETE_PROFILE,
            profileId: 'stale-profile-id',
            connectedToX: true,
          },
        },
        { keyringId: 'entropy-1', canonicalProfileId: 'current-profile-id' },
      );
      expect(selectProfile(state)).toBeUndefined();
      expect(selectIsConnectedToX(state)).toBe(false);
    });

    it('returns true when an X profile is linked even if the stored profile is stale', () => {
      const state = buildState(
        {
          profile: {
            ...COMPLETE_PROFILE,
            profileId: 'stale-profile-id',
            connectedToX: false,
          },
          xProfile: X_PROFILE,
        },
        { keyringId: 'entropy-1', canonicalProfileId: 'current-profile-id' },
      );
      expect(selectIsConnectedToX(state)).toBe(true);
    });
  });
});
