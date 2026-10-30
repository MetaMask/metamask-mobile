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
 * Returns the i18n key for a position's exclusion label, or `null` when the
 * position has no flags and should stay interactive.
 *
 * Preference: insider, then developer, then a generic excluded label for any
 * other non-empty flags list.
 */
export const getPositionFlagLabelKey = (position: Position): string | null => {
  const flags = position.flags;
  if (!flags?.length) {
    return null;
  }
  if (flags.includes(INSIDER_POSITION_FLAG)) {
    return POSITION_FLAG_LABEL_KEYS.insider;
  }
  if (flags.includes(DEVELOPER_POSITION_FLAG)) {
    return POSITION_FLAG_LABEL_KEYS.developer;
  }
  return POSITION_FLAG_LABEL_KEYS.excluded;
};
