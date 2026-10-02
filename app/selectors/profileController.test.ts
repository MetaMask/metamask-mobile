import {
  selectProfileControllerState,
  selectProfile,
  selectXProfile,
  selectIsConnectedToX,
} from './profileController';
import { RootState } from '../reducers';
import { getDefaultProfileControllerState } from '@metamask/profile-controller';

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
  });
});
