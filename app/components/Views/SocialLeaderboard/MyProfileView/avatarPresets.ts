import { brandColor } from '@metamask/design-tokens';
import type { ImageSourcePropType } from 'react-native';
import superheroAvatar from '../../../../images/socialV1/superhero.png';
import superheroArt from '../../../../images/socialV1/superhero-art.png';

export type ProfileAvatarPreset =
  | {
      id: string;
      kind: 'image';
      source: ImageSourcePropType;
      /** Same artwork on a transparent background, drawn over a picked color. */
      artSource: ImageSourcePropType;
    }
  | {
      id: string;
      kind: 'emoji';
      emoji: string;
      backgroundClassName: string;
    };

/**
 * Stand-in looks for profile onboarding. The grid repeats these instead of
 * a designed avatar set.
 */
export const PROFILE_AVATAR_PRESETS: readonly ProfileAvatarPreset[] = [
  {
    id: 'fox-photo',
    kind: 'image',
    source: superheroAvatar,
    artSource: superheroArt,
  },
  {
    id: 'fox-emoji',
    kind: 'emoji',
    emoji: '🦊',
    backgroundClassName: 'bg-warning-muted',
  },
];

export const DEFAULT_PROFILE_AVATAR_PRESET_ID = PROFILE_AVATAR_PRESETS[0].id;

export const getProfileAvatarPreset = (
  presetId: string | null | undefined,
): ProfileAvatarPreset | undefined =>
  PROFILE_AVATAR_PRESETS.find((preset) => preset.id === presetId);

export interface ProfileAvatarBackground {
  id: string;
  color: string;
}

/** Backdrop colors the user can swipe through behind their avatar. */
export const PROFILE_AVATAR_BACKGROUNDS: readonly ProfileAvatarBackground[] = [
  { id: 'peach', color: brandColor.orange200 },
  { id: 'lilac', color: brandColor.purple100 },
  { id: 'sky', color: brandColor.indigo200 },
  { id: 'lime', color: brandColor.lime100 },
];

export const DEFAULT_PROFILE_AVATAR_BACKGROUND_ID =
  PROFILE_AVATAR_BACKGROUNDS[1].id;

export const getProfileAvatarBackground = (
  backgroundId: string | null | undefined,
): ProfileAvatarBackground | undefined =>
  PROFILE_AVATAR_BACKGROUNDS.find(
    (background) => background.id === backgroundId,
  );
