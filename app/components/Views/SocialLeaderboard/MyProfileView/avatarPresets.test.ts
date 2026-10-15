import { brandColor } from '@metamask/design-tokens';
import {
  DEFAULT_PROFILE_AVATAR_BACKGROUND_ID,
  DEFAULT_PROFILE_AVATAR_PRESET_ID,
  getProfileAvatarBackground,
  getProfileAvatarPreset,
  PROFILE_AVATAR_BACKGROUNDS,
  PROFILE_AVATAR_PRESETS,
} from './avatarPresets';

describe('avatarPresets', () => {
  it('lists each onboarding look once', () => {
    const ids = PROFILE_AVATAR_PRESETS.map((preset) => preset.id);

    expect(ids).toHaveLength(14);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('resolves the default look and backdrop', () => {
    expect(getProfileAvatarPreset(DEFAULT_PROFILE_AVATAR_PRESET_ID)?.id).toBe(
      'visor',
    );
    expect(
      getProfileAvatarBackground(DEFAULT_PROFILE_AVATAR_BACKGROUND_ID)?.color,
    ).toBe(brandColor.purple300);
  });

  it('returns undefined for unknown or missing ids', () => {
    expect(getProfileAvatarPreset('retired-preset')).toBeUndefined();
    expect(getProfileAvatarPreset(null)).toBeUndefined();
    expect(getProfileAvatarBackground('neon')).toBeUndefined();
    expect(getProfileAvatarBackground(undefined)).toBeUndefined();
  });

  it('takes every backdrop color from the brand palette', () => {
    const brandValues = Object.values(brandColor);

    PROFILE_AVATAR_BACKGROUNDS.forEach((background) => {
      expect(brandValues).toContain(background.color);
    });
  });
});
