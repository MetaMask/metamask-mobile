import { brandColor } from '@metamask/design-tokens';
import { AvatarSocialBackgroundColor } from '../../../../component-library/components-temp/AvatarSocial';
import {
  FoxiconVariant,
  RetiredFoxiconVariant,
} from '../../../../component-library/components-temp/Foxicon';
import {
  DEFAULT_PROFILE_AVATAR_BACKGROUND_ID,
  DEFAULT_PROFILE_AVATAR_PRESET_ID,
  FALLBACK_PROFILE_AVATAR,
  getProfileAvatarBackground,
  getProfileAvatarPreset,
  parseFoxiconAvatarUrl,
  PROFILE_AVATAR_BACKGROUNDS,
  PROFILE_AVATAR_PRESETS,
  toFoxiconAvatarUrl,
} from './avatarPresets';

describe('avatarPresets', () => {
  it('lists every current look once', () => {
    const ids = PROFILE_AVATAR_PRESETS.map((preset) => preset.id);

    expect(ids).toHaveLength(14);
    expect([...ids].sort()).toEqual(Object.values(FoxiconVariant).sort());
  });

  it('offers every AvatarSocial background slot', () => {
    expect(
      PROFILE_AVATAR_BACKGROUNDS.map((background) => background.id),
    ).toEqual(Object.values(AvatarSocialBackgroundColor));
  });

  it('resolves the default look and backdrop', () => {
    expect(getProfileAvatarPreset(DEFAULT_PROFILE_AVATAR_PRESET_ID)?.id).toBe(
      FoxiconVariant.Vr,
    );
    expect(
      getProfileAvatarBackground(DEFAULT_PROFILE_AVATAR_BACKGROUND_ID)?.color,
    ).toBe(brandColor.purple300);
  });

  it.each([
    ['punk', FoxiconVariant.Goth],
    ['visor', FoxiconVariant.Vr],
    ['glasses', FoxiconVariant.Nerd],
    ['astronaut', FoxiconVariant.Astro],
    ['sunglasses', FoxiconVariant.Agent],
  ])('translates the legacy %s preset to %s', (legacyId, variant) => {
    expect(getProfileAvatarPreset(legacyId)?.id).toBe(variant);
  });

  it.each([
    ...Object.values(RetiredFoxiconVariant),
    'hero',
    'crown',
    'top-hat',
    'ice',
    'skull',
    'halo',
  ])('does not offer the retired %s preset', (presetId) => {
    expect(getProfileAvatarPreset(presetId)).toBeUndefined();
  });

  it.each([
    ['peach', AvatarSocialBackgroundColor.Background1, brandColor.orange200],
    ['lilac', AvatarSocialBackgroundColor.Background2, brandColor.purple100],
    ['purple', AvatarSocialBackgroundColor.Background3, brandColor.purple300],
    ['sky', AvatarSocialBackgroundColor.Background4, brandColor.indigo200],
    ['lime', AvatarSocialBackgroundColor.Background7, brandColor.lime100],
  ])(
    'translates the legacy %s backdrop to %s with the same color',
    (legacyId, slot, color) => {
      expect(getProfileAvatarBackground(legacyId)).toEqual(
        expect.objectContaining({ id: slot, color }),
      );
    },
  );

  it('returns undefined for unknown or missing ids', () => {
    expect(getProfileAvatarPreset('retired-preset')).toBeUndefined();
    expect(getProfileAvatarPreset(null)).toBeUndefined();
    expect(getProfileAvatarBackground('neon')).toBeUndefined();
    expect(getProfileAvatarBackground(undefined)).toBeUndefined();
  });

  it('round-trips a preset and backdrop through a foxicon URL', () => {
    expect(toFoxiconAvatarUrl('zombie', 'background7')).toBe(
      'foxicon://zombie/background7',
    );
    expect(parseFoxiconAvatarUrl('foxicon://zombie/background7')).toEqual({
      avatarPresetId: FoxiconVariant.Zombie,
      avatarBackgroundId: AvatarSocialBackgroundColor.Background7,
    });
  });

  it('translates legacy ids when parsing a foxicon URL', () => {
    expect(parseFoxiconAvatarUrl('foxicon://visor/purple')).toEqual({
      avatarPresetId: FoxiconVariant.Vr,
      avatarBackgroundId: AvatarSocialBackgroundColor.Background3,
    });
  });

  it('ignores values that are not foxicon URLs', () => {
    expect(parseFoxiconAvatarUrl('https://example.com/a.png')).toBeNull();
    expect(parseFoxiconAvatarUrl(null)).toBeNull();
  });

  it.each([
    'foxicon://royal/background1',
    'foxicon://hero/lime',
    'foxicon://retired/lime',
    'foxicon://zombie/lime/extra',
    'foxicon://',
  ])('parses %s as the astronaut on the sky backdrop', (avatarUrl) => {
    expect(parseFoxiconAvatarUrl(avatarUrl)).toEqual(FALLBACK_PROFILE_AVATAR);
    expect(FALLBACK_PROFILE_AVATAR).toEqual({
      avatarPresetId: FoxiconVariant.Astro,
      avatarBackgroundId: AvatarSocialBackgroundColor.Background4,
    });
  });

  it('keeps a current look with an unknown backdrop on the default backdrop', () => {
    expect(parseFoxiconAvatarUrl('foxicon://zombie/neon')).toEqual({
      avatarPresetId: FoxiconVariant.Zombie,
      avatarBackgroundId: DEFAULT_PROFILE_AVATAR_BACKGROUND_ID,
    });
  });

  it('takes every backdrop color from the brand palette', () => {
    const brandValues = Object.values(brandColor);

    PROFILE_AVATAR_BACKGROUNDS.forEach((background) => {
      expect(brandValues).toContain(background.color);
    });
  });
});
