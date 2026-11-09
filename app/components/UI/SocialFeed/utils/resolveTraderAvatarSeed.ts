/**
 * Seed for a trader's fallback identicon.
 *
 * The profile id is the seed everywhere. The social API is dropping wallet
 * addresses, so an address must not change the icon. A missing profile id
 * falls back to the wallet address so a caller that only has one still
 * renders a distinct icon.
 */
export const resolveTraderAvatarSeed = (
  profileId?: string | null,
  address?: string | null,
): string => {
  const id = profileId?.trim() ?? '';
  if (id.length > 0) {
    return id;
  }
  return address?.trim() ?? '';
};
