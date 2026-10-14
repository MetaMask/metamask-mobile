import {
  selectProfileControllerState,
  selectProfileControllerProfile,
  selectProfileControllerXProfile,
  selectIsConnectedToX,
} from './profileController';
import { RootState } from '../reducers';

function buildState(
  profileControllerState?: Record<string, unknown> | null,
): RootState {
  return {
    engine: {
      backgroundState: {
        ProfileController: profileControllerState,
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
      expect(selectProfileControllerState(state)?.profile).toEqual(
        COMPLETE_PROFILE,
      );
    });

    it('passes the controller state through when it is absent', () => {
      // No default-state fallback: the selector reads backgroundState
      // directly and surfaces whatever the engine persisted.
      expect(selectProfileControllerState(buildState(null))).toBeNull();
    });
  });

  describe('selectProfileControllerProfile', () => {
    it('returns the profile when a profileId exists', () => {
      const state = buildState({
        profile: COMPLETE_PROFILE,
      });
      expect(selectProfileControllerProfile(state)).toEqual(COMPLETE_PROFILE);
    });

    it('returns undefined when no profile has been created (empty profileId)', () => {
      const state = buildState({
        profile: { ...COMPLETE_PROFILE, profileId: '' },
      });
      expect(selectProfileControllerProfile(state)).toBeUndefined();
    });
  });

  describe('selectProfileControllerXProfile', () => {
    it('returns the linked X profile when present', () => {
      const state = buildState({
        profile: COMPLETE_PROFILE,
        xProfile: X_PROFILE,
      });
      expect(selectProfileControllerXProfile(state)).toEqual(X_PROFILE);
    });

    it('returns undefined when no X profile is linked', () => {
      const state = buildState({ profile: COMPLETE_PROFILE });
      expect(selectProfileControllerXProfile(state)).toBeUndefined();
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
  });
});
