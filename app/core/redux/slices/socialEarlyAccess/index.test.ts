import reducer, {
  clearSocialEarlyAccess,
  initialState,
  selectHasSocialEarlyAccess,
  selectSocialEarlyAccessProfileId,
  setSocialEarlyAccess,
  SocialEarlyAccessSliceState,
} from '.';
import { RootState } from '../../../../reducers';

const buildState = (
  socialEarlyAccess: SocialEarlyAccessSliceState | undefined,
): RootState => ({ socialEarlyAccess }) as unknown as RootState;

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
  it.each([true, false])('returns the stored answer %s', (hasAccess) => {
    const state = buildState({ profileId: 'profile-1', hasAccess });

    const result = selectHasSocialEarlyAccess(state);

    expect(result).toBe(hasAccess);
  });

  it('returns false when the slice is missing from state', () => {
    const state = buildState(undefined);

    const result = selectHasSocialEarlyAccess(state);

    expect(result).toBe(false);
  });
});

describe('selectSocialEarlyAccessProfileId', () => {
  it('returns the profile the stored answer belongs to', () => {
    const state = buildState({ profileId: 'profile-1', hasAccess: true });

    const result = selectSocialEarlyAccessProfileId(state);

    expect(result).toBe('profile-1');
  });

  it('returns null when the slice is missing from state', () => {
    const state = buildState(undefined);

    const result = selectSocialEarlyAccessProfileId(state);

    expect(result).toBeNull();
  });
});
