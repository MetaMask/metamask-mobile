import { brandColor } from '@metamask/design-tokens';
import type { ImageSourcePropType } from 'react-native';
import astronautAvatar from '../assets/avatars/astronaut.png';
import crownAvatar from '../assets/avatars/crown.png';
import cyborgAvatar from '../assets/avatars/cyborg.png';
import glassesAvatar from '../assets/avatars/glasses.png';
import haloAvatar from '../assets/avatars/halo.png';
import heroAvatar from '../assets/avatars/hero.png';
import iceAvatar from '../assets/avatars/ice.png';
import pirateAvatar from '../assets/avatars/pirate.png';
import punkAvatar from '../assets/avatars/punk.png';
import skullAvatar from '../assets/avatars/skull.png';
import sunglassesAvatar from '../assets/avatars/sunglasses.png';
import topHatAvatar from '../assets/avatars/top-hat.png';
import visorAvatar from '../assets/avatars/visor.png';
import zombieAvatar from '../assets/avatars/zombie.png';

export interface ProfileAvatarPreset {
  id: string;
  /** Fox artwork on a transparent background, drawn over a backdrop color. */
  source: ImageSourcePropType;
}

/** Onboarding looks, in the order the avatar grid shows them. */
export const PROFILE_AVATAR_PRESETS: readonly ProfileAvatarPreset[] = [
  { id: 'hero', source: heroAvatar },
  { id: 'punk', source: punkAvatar },
  { id: 'visor', source: visorAvatar },
  { id: 'crown', source: crownAvatar },
  { id: 'glasses', source: glassesAvatar },
  { id: 'top-hat', source: topHatAvatar },
  { id: 'ice', source: iceAvatar },
  { id: 'cyborg', source: cyborgAvatar },
  { id: 'skull', source: skullAvatar },
  { id: 'astronaut', source: astronautAvatar },
  { id: 'halo', source: haloAvatar },
  { id: 'sunglasses', source: sunglassesAvatar },
  { id: 'pirate', source: pirateAvatar },
  { id: 'zombie', source: zombieAvatar },
];

export const DEFAULT_PROFILE_AVATAR_PRESET_ID = 'visor';

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
  { id: 'sky', color: brandColor.indigo200 },
  { id: 'purple', color: brandColor.purple300 },
  { id: 'lime', color: brandColor.lime100 },
  { id: 'lilac', color: brandColor.purple100 },
];

export const DEFAULT_PROFILE_AVATAR_BACKGROUND_ID =
  PROFILE_AVATAR_BACKGROUNDS[2].id;

export const getProfileAvatarBackground = (
  backgroundId: string | null | undefined,
): ProfileAvatarBackground | undefined =>
  PROFILE_AVATAR_BACKGROUNDS.find(
    (background) => background.id === backgroundId,
  );
