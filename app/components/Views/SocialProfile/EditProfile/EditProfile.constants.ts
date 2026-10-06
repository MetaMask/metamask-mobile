import type { ImageOrSvgSrc } from '@metamask/design-system-react-native';

/**
 * The profile attributes the Manage profile screen renders.
 *
 * Optional fields are absent until the user sets them, so the screen must read
 * every one of them as potentially empty.
 */
export interface Profile {
  /** The user's uploaded picture. Undefined until one is set. */
  image?: ImageOrSvgSrc;
  displayName: string;
  handle: string;
  bio: string;
  socialHandle: string;
  /** Whether trading activity is shared publicly. Renders as "On" / "Off". */
  isTradingActivityVisible: boolean;
  linkedSocialAccountName: string;
  /** Drives the Maskicon for the linked account chip. Empty when none is linked. */
  linkedSocialAccountAddress: string;
}

/**
 * The starting profile: nothing set.
 *
 * TODO: replace with the real profile selector once the profile controller
 * lands. Until then a new user's empty profile is the honest default.
 */
export const EMPTY_PROFILE: Profile = {
  image: undefined,
  displayName: '',
  handle: '',
  bio: '',
  socialHandle: '',
  isTradingActivityVisible: false,
  linkedSocialAccountName: '',
  linkedSocialAccountAddress: '',
};

/**
 * Character limits enforced by the edit forms.
 *
 * These cap what a user can type. Values arriving from elsewhere may still be
 * longer, so the rows truncate independently of these limits.
 */
export const PROFILE_FIELD_MAX_LENGTH = {
  displayName: 32,
} as const;
