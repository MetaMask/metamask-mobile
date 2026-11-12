import type { Position, TraderProfile } from '@metamask/social-controllers';

/**
 * `Position.profileId` (the owner's profile id) until
 * `@metamask/social-controllers` ships it; older API builds omit it.
 * TODO: Drop once the core release with `Position.profileId` is installed.
 */
export type PositionWithOwner = Position & { profileId?: string };

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
  const { profileId: ownerProfileId } = position as PositionWithOwner;
  if (!ownerProfileId || ownerProfileId === (profile?.profileId ?? traderId)) {
    return traderId;
  }
  return resolveOwnerMismatchProfileId(ownerProfileId);
};
