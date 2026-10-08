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

/** Keeps a long bio truncating to the right instead of filling the row. */
export const BIO_VALUE_MAX_WIDTH = 120;
