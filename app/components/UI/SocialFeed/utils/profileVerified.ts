/**
 * Whether a social-api profile carries the Profile API verified flag. Only
 * `true` counts: a missing or `null` value, as older social-api builds send,
 * means not verified.
 *
 * Takes any object because `@metamask/social-controllers` does not type
 * `verified` on its profile shapes yet; social-api sends it all the same.
 */
export const isProfileVerified = (
  profile: object | null | undefined,
): boolean =>
  (profile as { verified?: unknown } | null | undefined)?.verified === true;
