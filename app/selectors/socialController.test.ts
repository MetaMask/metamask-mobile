import { selectFollowingProfileIds } from './socialController';

describe('selectFollowingProfileIds', () => {
  it('returns followingProfileIds from SocialController state', () => {
    const state = {
      engine: {
        backgroundState: {
          SocialController: {
            followingProfileIds: ['id-1', 'id-2'],
          },
        },
      },
    };
    expect(selectFollowingProfileIds(state as never)).toEqual(['id-1', 'id-2']);
  });

  it('returns an empty array when SocialController is missing', () => {
    const state = { engine: { backgroundState: {} } };
    expect(selectFollowingProfileIds(state as never)).toEqual([]);
  });

  it('returns an empty array when followingProfileIds is missing', () => {
    const state = {
      engine: { backgroundState: { SocialController: {} } },
    };
    expect(selectFollowingProfileIds(state as never)).toEqual([]);
  });

  it('returns an empty array when state is undefined', () => {
    expect(selectFollowingProfileIds(undefined as never)).toEqual([]);
  });
});
