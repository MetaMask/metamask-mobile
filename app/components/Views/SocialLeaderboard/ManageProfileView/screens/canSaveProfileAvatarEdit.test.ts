import { canSaveProfileAvatarEdit } from './canSaveProfileAvatarEdit';

describe('canSaveProfileAvatarEdit', () => {
  it('skips the profile write when there is no network', () => {
    expect(canSaveProfileAvatarEdit('NONE')).toBe(false);
  });

  it('allows the write on a usable or unknown network', () => {
    expect(canSaveProfileAvatarEdit('WIFI')).toBe(true);
    expect(canSaveProfileAvatarEdit('SLOW_CELLULAR')).toBe(true);
    expect(canSaveProfileAvatarEdit(null)).toBe(true);
  });
});
