// Clicker returns a generic placeholder image for every `.eth` trader who
// has no real profile picture. We want those to fall through to the Maskicon
// fallback rather than render the shared placeholder. Add URLs here if we
// learn of additional defaults (Farcaster, Twitter, etc.).
export const KNOWN_DEFAULT_AVATAR_URLS: readonly string[] = [
  'https://daylight-images.s3.us-east-1.amazonaws.com/ens-fallback.png',
];

/**
 * True when `avatarUri` is a real per-user image, false when it's missing,
 * empty, or matches a known shared placeholder.
 */
export function hasRealAvatar(
  avatarUri: string | null | undefined,
): avatarUri is string {
  if (!avatarUri) return false;
  return !KNOWN_DEFAULT_AVATAR_URLS.includes(avatarUri);
}
