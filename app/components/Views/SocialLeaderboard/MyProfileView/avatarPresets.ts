import { brandColor } from '@metamask/design-tokens';
import { AvatarSocialBackgroundColor } from '../../../../component-library/components-temp/AvatarSocial';
import {
  AVATARSOCIAL_FALLBACK_BACKGROUND_COLOR,
  BRAND_COLOR_BY_AVATARSOCIAL_BACKGROUND_COLOR,
} from '../../../../component-library/components-temp/AvatarSocial/AvatarSocial.constants';
import {
  FOXICON_FALLBACK_VARIANT,
  FoxiconVariant,
} from '../../../../component-library/components-temp/Foxicon';

export interface ProfileAvatarPreset {
  id: FoxiconVariant;
}

/** Onboarding looks, in the order the avatar grid shows them. */
export const PROFILE_AVATAR_PRESETS: readonly ProfileAvatarPreset[] = [
  { id: FoxiconVariant.Athlete },
  { id: FoxiconVariant.Football },
  { id: FoxiconVariant.Nerd },
  { id: FoxiconVariant.Chrome },
  { id: FoxiconVariant.Agent },
  { id: FoxiconVariant.Laser },
  { id: FoxiconVariant.Beanie },
  { id: FoxiconVariant.Hearts },
  { id: FoxiconVariant.Zombie },
  { id: FoxiconVariant.Aviator },
  { id: FoxiconVariant.Vr },
  { id: FoxiconVariant.Astro },
  { id: FoxiconVariant.Goth },
  { id: FoxiconVariant.Magma },
];

/**
 * Preset ids saved before the Foxicon artwork that still have a current look;
 * read-only compatibility. Other old ids render the fallback avatar.
 */
const LEGACY_AVATAR_PRESET_IDS: Readonly<Record<string, FoxiconVariant>> = {
  punk: FoxiconVariant.Goth,
  visor: FoxiconVariant.Vr,
  glasses: FoxiconVariant.Nerd,
  astronaut: FoxiconVariant.Astro,
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

/** `foxicon://{avatarVariant}/{backgroundColor}` stored in ProfileController `avatarUrl`. */
export const toFoxiconAvatarUrl = (
  avatarPresetId: string,
  avatarBackgroundId: string,
): string => `${FOXICON_AVATAR_SCHEME}${avatarPresetId}/${avatarBackgroundId}`;

export interface ProfileAvatarSelection {
  avatarPresetId: FoxiconVariant;
  avatarBackgroundId: AvatarSocialBackgroundColor;
}

/** Drawn for any foxicon avatar whose look is not in the current set. */
export const FALLBACK_PROFILE_AVATAR: ProfileAvatarSelection = {
  avatarPresetId: FOXICON_FALLBACK_VARIANT,
  avatarBackgroundId: AVATARSOCIAL_FALLBACK_BACKGROUND_COLOR,
};

/**
 * Parses a foxicon URL, translating legacy ids to the current ones. Any
 * `foxicon://` value whose look is retired, unknown, or malformed resolves to
 * {@link FALLBACK_PROFILE_AVATAR}; an unknown backdrop uses the default one.
 */
export const parseFoxiconAvatarUrl = (
  avatarUrl: string | null | undefined,
): ProfileAvatarSelection | null => {
  if (!avatarUrl?.startsWith(FOXICON_AVATAR_SCHEME)) {
    return null;
  }

  const [presetPart, backgroundPart, extra] = avatarUrl
    .slice(FOXICON_AVATAR_SCHEME.length)
    .split('/');

  const preset =
    extra === undefined ? getProfileAvatarPreset(presetPart) : undefined;
  if (!preset) {
    return FALLBACK_PROFILE_AVATAR;
  }

  return {
    avatarPresetId: preset.id,
    avatarBackgroundId:
      getProfileAvatarBackground(backgroundPart)?.id ??
      DEFAULT_PROFILE_AVATAR_BACKGROUND_ID,
  };
};
