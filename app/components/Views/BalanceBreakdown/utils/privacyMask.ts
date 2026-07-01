const MASK_CHAR = '•';

const LENGTH = {
  short: 6,
  medium: 9,
  long: 12,
} as const;

export type PrivacyMaskLength = keyof typeof LENGTH;

export function getPrivacyMaskText(length: PrivacyMaskLength): string {
  return MASK_CHAR.repeat(LENGTH[length]);
}
