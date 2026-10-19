import { brandColor } from '@metamask/design-tokens';
import {
  DEFAULT_PROFILE_AVATAR_BACKGROUND_ID,
  DEFAULT_PROFILE_AVATAR_PRESET_ID,
  getProfileAvatarBackground,
  getProfileAvatarPreset,
  parseFoxiconAvatarUrl,
  PROFILE_AVATAR_BACKGROUNDS,
  PROFILE_AVATAR_PRESETS,
  toFoxiconAvatarUrl,
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

  it('round-trips a preset and backdrop through a foxicon URL', () => {
    expect(toFoxiconAvatarUrl('zombie', 'lime')).toBe('foxicon://zombie/lime');
    expect(parseFoxiconAvatarUrl('foxicon://zombie/lime')).toEqual({
      avatarPresetId: 'zombie',
      avatarBackgroundId: 'lime',
    });
    expect(parseFoxiconAvatarUrl('https://example.com/a.png')).toBeNull();
    expect(parseFoxiconAvatarUrl('foxicon://retired/lime')).toBeNull();
  });

  it('takes every backdrop color from the brand palette', () => {
    const brandValues = Object.values(brandColor);

    PROFILE_AVATAR_BACKGROUNDS.forEach((background) => {
      expect(brandValues).toContain(background.color);
    });
  });
});
