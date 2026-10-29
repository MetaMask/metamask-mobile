import { brandColor } from '@metamask/design-tokens';
import { AvatarSocialBackgroundColor } from '../../../../component-library/components-temp/AvatarSocial';
import { FoxiconVariant } from '../../../../component-library/components-temp/Foxicon';
import {
  DEFAULT_PROFILE_AVATAR_BACKGROUND_ID,
  DEFAULT_PROFILE_AVATAR_PRESET_ID,
  getProfileAvatarBackground,
  getProfileAvatarPreset,
  isFoxiconAvatarUrl,
  parseFoxiconAvatarUrl,
  PROFILE_AVATAR_BACKGROUNDS,
  PROFILE_AVATAR_PRESETS,
  toFoxiconAvatarUrl,
} from './avatarPresets';

describe('avatarPresets', () => {
  it('lists each onboarding look once, without the base fox', () => {
    const ids = PROFILE_AVATAR_PRESETS.map((preset) => preset.id);

    expect(ids).toHaveLength(14);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain(FoxiconVariant.Base);
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
    ['hero', FoxiconVariant.Superhero],
    ['punk', FoxiconVariant.Goth],
    ['visor', FoxiconVariant.Vr],
    ['crown', FoxiconVariant.Royal],
    ['glasses', FoxiconVariant.Nerd],
    ['top-hat', FoxiconVariant.Gentleman],
    ['ice', FoxiconVariant.Frozen],
    ['cyborg', FoxiconVariant.Cyborg],
    ['skull', FoxiconVariant.Cannibal],
    ['astronaut', FoxiconVariant.Astro],
    ['halo', FoxiconVariant.Angel],
    ['sunglasses', FoxiconVariant.Agent],
    ['pirate', FoxiconVariant.Pirate],
    ['zombie', FoxiconVariant.Zombie],
  ])('translates the legacy %s preset to %s', (legacyId, variant) => {
    expect(getProfileAvatarPreset(legacyId)?.id).toBe(variant);
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
    expect(getProfileAvatarPreset(FoxiconVariant.Base)).toBeUndefined();
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

  it('rejects malformed or unknown foxicon URLs', () => {
    expect(parseFoxiconAvatarUrl('https://example.com/a.png')).toBeNull();
    expect(parseFoxiconAvatarUrl('foxicon://retired/lime')).toBeNull();
    expect(parseFoxiconAvatarUrl('foxicon://zombie/neon')).toBeNull();
    expect(parseFoxiconAvatarUrl('foxicon://zombie/lime/extra')).toBeNull();
    expect(isFoxiconAvatarUrl('foxicon://retired/lime')).toBe(true);
    expect(isFoxiconAvatarUrl('https://example.com/a.png')).toBe(false);
  });

  it('takes every backdrop color from the brand palette', () => {
    const brandValues = Object.values(brandColor);

    PROFILE_AVATAR_BACKGROUNDS.forEach((background) => {
      expect(brandValues).toContain(background.color);
    });
  });
});
