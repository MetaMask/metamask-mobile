import {
  DEVELOPER_POSITION_FLAG,
  INSIDER_POSITION_FLAG,
  type Position,
} from '@metamask/social-controllers';

export const POSITION_FLAG_LABEL_KEYS = {
  insider: 'social_leaderboard.position_flags.insider',
  developer: 'social_leaderboard.position_flags.developer',
  excluded: 'social_leaderboard.position_flags.excluded',
} as const;

/**
 * True when the server excluded this position from P&L and copy-trade.
 * Any non-empty `flags` list counts, including unrecognized values.
 * `null`, omitted, and empty lists are not flagged.
 */
export const isPositionFlagged = (
  position: Pick<Position, 'flags'> | null | undefined,
): boolean => Boolean(position?.flags?.length);

/**
 * Returns the i18n key for a position's exclusion label, or `null` when the
 * position has no flags.
 *
 * Preference: insider, then developer, then a generic excluded label for any
 * other non-empty flags list.
 */
export const getPositionFlagLabelKey = (position: Position): string | null => {
  if (!isPositionFlagged(position)) {
    return null;
  }
  const flags = position.flags ?? [];
  if (flags.includes(INSIDER_POSITION_FLAG)) {
    return POSITION_FLAG_LABEL_KEYS.insider;
  }
  if (flags.includes(DEVELOPER_POSITION_FLAG)) {
    return POSITION_FLAG_LABEL_KEYS.developer;
  }
  return POSITION_FLAG_LABEL_KEYS.excluded;
};
