import { getDefaultProfileControllerState } from '@metamask/profile-controller';
import {
  selectProfile,
  selectProfileControllerState,
  selectXProfile,
} from './profileController';

const profile = {
  ...getDefaultProfileControllerState().profile,
  profileId: 'session-profile',
  username: 'wen-cat',
  displayName: 'Wen Cat',
};

const xProfile = {
  xUserId: 'x-1',
  xProfileUrl: 'https://x.com/wen-cat',
  username: 'wen-cat',
  displayName: 'Wen Cat',
  avatarUrl: 'https://example.com/avatar.png',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const stateWith = (profileController: Record<string, unknown> | undefined) =>
  ({
    engine: {
      backgroundState: {
        ...(profileController ? { ProfileController: profileController } : {}),
      },
    },
  }) as never;

describe('profileController selectors', () => {
  it('returns the default state when ProfileController is missing', () => {
    expect(selectProfileControllerState(stateWith(undefined))).toEqual(
      getDefaultProfileControllerState(),
    );
    expect(selectProfile(stateWith(undefined))).toBeUndefined();
    expect(selectXProfile(stateWith(undefined))).toBeUndefined();
  });

  it('hides the empty default profile', () => {
    const controllerState = getDefaultProfileControllerState();

    expect(selectProfile(stateWith(controllerState))).toBeUndefined();
    expect(selectXProfile(stateWith(controllerState))).toBeUndefined();
  });

  it('returns a created profile and a linked X account', () => {
    const controllerState = {
      profile,
      xProfile,
    };

    expect(selectProfile(stateWith(controllerState))).toEqual(profile);
    expect(selectXProfile(stateWith(controllerState))).toEqual(xProfile);
  });
});
