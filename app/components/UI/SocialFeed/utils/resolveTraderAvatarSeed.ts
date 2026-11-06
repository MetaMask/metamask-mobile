/**
 * Seed for a trader's fallback identicon.
 *
 * The wallet address is the seed the profile uses, so a list row and that
 * trader's profile draw the same icon. A blank address falls back to the
 * profile id, which keeps traders who have no wallet distinct from each other.
 */
export const resolveTraderAvatarSeed = (
  address?: string | null,
  profileId?: string | null,
): string => {
  const wallet = address?.trim() ?? '';
  if (wallet.length > 0) {
    return wallet;
  }
  return profileId?.trim() ?? '';
};
