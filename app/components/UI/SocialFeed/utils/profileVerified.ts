/**
 * Whether a social-api profile carries the Profile API verified flag. Only
 * `true` counts: a missing or `null` value, as older social-api builds send,
 * means not verified.
 *
 * Accepts any object so callers can pass the various profile shapes.
 * `verified` is optional on those types.
 */
export const isProfileVerified = (
  profile: object | null | undefined,
): boolean => {
  if (profile == null || !('verified' in profile)) {
    return false;
  }
  return profile.verified === true;
};
