import type { ImageOrSvgSrc } from '@metamask/design-system-react-native';

/** Every field is optional in practice, so the screen reads each as possibly empty. */
export interface Profile {
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
 * Caps what a user can type. Values from elsewhere may be longer, so rows
 * truncate independently of this.
 */
export const PROFILE_FIELD_MAX_LENGTH = {
  displayName: 32,
} as const;

/** Keeps a long bio truncating to the right instead of filling the row. */
export const BIO_VALUE_MAX_WIDTH = 120;
