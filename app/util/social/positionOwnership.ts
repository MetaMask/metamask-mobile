import type { Position, TraderProfile } from '@metamask/social-controllers';

/**
 * Who a position is shown under when the link's trader doesn't own it.
 * Open question: showing the real owner (today) or a toast instead.
 */
export const resolveOwnerMismatchProfileId = (ownerProfileId: string): string =>
  ownerProfileId;

/**
 * The profile id to attribute a position to. A link's `traderId` is only a
 * hint, and may be an address, so it is compared through the profile it
 * resolved to; a failed profile read falls back to `traderId` itself. Without
 * an owner (older API) the hint is trusted, as before.
 */
export const resolvePositionAuthorProfileId = (
  position: Position,
  traderId: string,
  profile?: Pick<TraderProfile, 'profileId'> | null,
): string => {
  const { profileId: ownerProfileId } = position;
  if (!ownerProfileId || ownerProfileId === (profile?.profileId ?? traderId)) {
    return traderId;
  }
  return resolveOwnerMismatchProfileId(ownerProfileId);
};
