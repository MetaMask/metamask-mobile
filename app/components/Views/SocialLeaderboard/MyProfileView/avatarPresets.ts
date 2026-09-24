import type { ImageSourcePropType } from 'react-native';
import superheroAvatar from '../../../../images/socialV1/superhero.png';

export type ProfileAvatarPreset =
  | {
      id: string;
      kind: 'image';
      source: ImageSourcePropType;
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
