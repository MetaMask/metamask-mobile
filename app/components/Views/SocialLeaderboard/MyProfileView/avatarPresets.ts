import { brandColor } from '@metamask/design-tokens';
import { AvatarSocialBackgroundColor } from '../../../../component-library/components-temp/AvatarSocial';
import { BRAND_COLOR_BY_AVATARSOCIAL_BACKGROUND_COLOR } from '../../../../component-library/components-temp/AvatarSocial/AvatarSocial.constants';
import { FoxiconVariant } from '../../../../component-library/components-temp/Foxicon';

export interface ProfileAvatarPreset {
  id: FoxiconVariant;
}

/** Onboarding looks, in the order the avatar grid shows them. */
export const PROFILE_AVATAR_PRESETS: readonly ProfileAvatarPreset[] = [
  { id: FoxiconVariant.Superhero },
  { id: FoxiconVariant.Goth },
  { id: FoxiconVariant.Vr },
  { id: FoxiconVariant.Royal },
  { id: FoxiconVariant.Nerd },
  { id: FoxiconVariant.Gentleman },
  { id: FoxiconVariant.Frozen },
  { id: FoxiconVariant.Cyborg },
  { id: FoxiconVariant.Cannibal },
  { id: FoxiconVariant.Astro },
  { id: FoxiconVariant.Angel },
  { id: FoxiconVariant.Agent },
  { id: FoxiconVariant.Pirate },
  { id: FoxiconVariant.Zombie },
];

/** Preset ids saved before the Foxicon artwork; read-only compatibility. */
const LEGACY_AVATAR_PRESET_IDS: Readonly<Record<string, FoxiconVariant>> = {
  hero: FoxiconVariant.Superhero,
  punk: FoxiconVariant.Goth,
  visor: FoxiconVariant.Vr,
  crown: FoxiconVariant.Royal,
  glasses: FoxiconVariant.Nerd,
  'top-hat': FoxiconVariant.Gentleman,
  ice: FoxiconVariant.Frozen,
  skull: FoxiconVariant.Cannibal,
  astronaut: FoxiconVariant.Astro,
  halo: FoxiconVariant.Angel,
  sunglasses: FoxiconVariant.Agent,
};

export const DEFAULT_PROFILE_AVATAR_PRESET_ID: FoxiconVariant =
  FoxiconVariant.Vr;

/** Resolves current and legacy preset ids to a preset in the picker. */
export const getProfileAvatarPreset = (
  presetId: string | null | undefined,
): ProfileAvatarPreset | undefined => {
  if (!presetId) {
    return undefined;
  }
  const id = LEGACY_AVATAR_PRESET_IDS[presetId] ?? presetId;
  return PROFILE_AVATAR_PRESETS.find((preset) => preset.id === id);
};

export interface ProfileAvatarBackground {
  id: AvatarSocialBackgroundColor;
  color: string;
  /** Suffix of the `avatar_background_*` accessibility label string. */
  labelKey: string;
}

const LABEL_KEY_BY_BACKGROUND: Record<AvatarSocialBackgroundColor, string> = {
  [AvatarSocialBackgroundColor.Background1]: 'peach',
  [AvatarSocialBackgroundColor.Background2]: 'lilac',
  [AvatarSocialBackgroundColor.Background3]: 'purple',
  [AvatarSocialBackgroundColor.Background4]: 'sky',
  [AvatarSocialBackgroundColor.Background5]: 'indigo',
  [AvatarSocialBackgroundColor.Background6]: 'pale_lime',
  [AvatarSocialBackgroundColor.Background7]: 'lime',
};

/** Backdrop colors the user can swipe through behind their avatar. */
export const PROFILE_AVATAR_BACKGROUNDS: readonly ProfileAvatarBackground[] =
  Object.values(AvatarSocialBackgroundColor).map((id) => ({
    id,
    color: brandColor[BRAND_COLOR_BY_AVATARSOCIAL_BACKGROUND_COLOR[id]],
    labelKey: LABEL_KEY_BY_BACKGROUND[id],
  }));

/** Backdrop ids saved before the AvatarSocial palette; read-only compatibility. */
const LEGACY_AVATAR_BACKGROUND_IDS: Readonly<
  Record<string, AvatarSocialBackgroundColor>
> = {
  peach: AvatarSocialBackgroundColor.Background1,
  lilac: AvatarSocialBackgroundColor.Background2,
  purple: AvatarSocialBackgroundColor.Background3,
  sky: AvatarSocialBackgroundColor.Background4,
  lime: AvatarSocialBackgroundColor.Background7,
};

export const DEFAULT_PROFILE_AVATAR_BACKGROUND_ID: AvatarSocialBackgroundColor =
  AvatarSocialBackgroundColor.Background3;

/** Resolves current and legacy backdrop ids to a backdrop in the palette. */
export const getProfileAvatarBackground = (
  backgroundId: string | null | undefined,
): ProfileAvatarBackground | undefined => {
  if (!backgroundId) {
    return undefined;
  }
  const id = LEGACY_AVATAR_BACKGROUND_IDS[backgroundId] ?? backgroundId;
  return PROFILE_AVATAR_BACKGROUNDS.find((background) => background.id === id);
};

const FOXICON_AVATAR_SCHEME = 'foxicon://';

/** True for any `foxicon://` value, including ones that fail preset parsing. */
export const isFoxiconAvatarUrl = (
  avatarUrl: string | null | undefined,
): boolean => Boolean(avatarUrl?.startsWith(FOXICON_AVATAR_SCHEME));

/** `foxicon://{avatarVariant}/{backgroundColor}` stored in ProfileController `avatarUrl`. */
export const toFoxiconAvatarUrl = (
  avatarPresetId: string,
  avatarBackgroundId: string,
): string => `${FOXICON_AVATAR_SCHEME}${avatarPresetId}/${avatarBackgroundId}`;

/** Parses a foxicon URL, translating legacy ids to the current ones. */
export const parseFoxiconAvatarUrl = (
  avatarUrl: string | null | undefined,
): {
  avatarPresetId: FoxiconVariant;
  avatarBackgroundId: AvatarSocialBackgroundColor;
} | null => {
  if (!avatarUrl?.startsWith(FOXICON_AVATAR_SCHEME)) {
    return null;
  }

  const [presetPart, backgroundPart, extra] = avatarUrl
    .slice(FOXICON_AVATAR_SCHEME.length)
    .split('/');

  if (extra !== undefined) {
    return null;
  }

  const preset = getProfileAvatarPreset(presetPart);
  const background = getProfileAvatarBackground(backgroundPart);
  if (!preset || !background) {
    return null;
  }

  return { avatarPresetId: preset.id, avatarBackgroundId: background.id };
};
