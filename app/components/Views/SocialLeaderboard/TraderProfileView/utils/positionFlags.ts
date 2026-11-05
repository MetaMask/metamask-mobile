import {
  DEVELOPER_POSITION_FLAG,
  INSIDER_POSITION_FLAG,
  type Position,
} from '@metamask/social-controllers';
import { strings } from '../../../../../../locales/i18n';

/**
 * How a flagged position is drawn.
 * `excluded` greys the row, mutes P&L colour, and shows the long exclusion label on its own line (legacy trader profile).
 * `subline` keeps full opacity and P&L colour, and appends the short flag word to the existing subtitle (V1 profile).
 */
export type FlaggedPositionPresentation = 'excluded' | 'subline';

type PositionFlagKind = 'insider' | 'developer' | 'excluded';

export const POSITION_FLAG_LABEL_KEYS = {
  insider: 'social_leaderboard.position_flags.insider',
  developer: 'social_leaderboard.position_flags.developer',
  excluded: 'social_leaderboard.position_flags.excluded',
} as const;

export const POSITION_FLAG_SHORT_LABEL_KEYS = {
  insider: 'social_leaderboard.position_flags.short.insider',
  developer: 'social_leaderboard.position_flags.short.creator',
  excluded: 'social_leaderboard.position_flags.short.excluded',
} as const;

const POSITION_FLAG_ACCESSIBILITY_REASON_KEYS = {
  insider: 'social_leaderboard.position_flags.accessibility.reason_insider',
  developer: 'social_leaderboard.position_flags.accessibility.reason_creator',
  excluded: 'social_leaderboard.position_flags.accessibility.reason_excluded',
} as const;

const POSITION_FLAG_DIRECTION_KEYS = {
  up: 'social_leaderboard.position_flags.accessibility.direction_up',
  down: 'social_leaderboard.position_flags.accessibility.direction_down',
  flat: 'social_leaderboard.position_flags.accessibility.direction_flat',
} as const;

export type FlaggedPositionPnlDirection =
  keyof typeof POSITION_FLAG_DIRECTION_KEYS;

const LABEL_KEYS_BY_PRESENTATION = {
  excluded: POSITION_FLAG_LABEL_KEYS,
  subline: POSITION_FLAG_SHORT_LABEL_KEYS,
} as const;

/**
 * Preference: insider, then developer, then a generic excluded label for any
 * other non-empty flags list.
 */
const getPositionFlagKind = (position: Position): PositionFlagKind | null => {
  const flags = position.flags;
  if (!flags?.length) {
    return null;
  }
  if (flags.includes(INSIDER_POSITION_FLAG)) {
    return 'insider';
  }
  if (flags.includes(DEVELOPER_POSITION_FLAG)) {
    return 'developer';
  }
  return 'excluded';
};

/**
 * Returns the i18n key for a position's flag label, or `null` when the
 * position has no flags and should stay interactive.
 *
 * `excluded` (the default) is the long exclusion sentence. `subline` is the
 * short word appended to the existing subtitle.
 */
export const getPositionFlagLabelKey = (
  position: Position,
  presentation: FlaggedPositionPresentation = 'excluded',
): string | null => {
  const kind = getPositionFlagKind(position);
  if (!kind) {
    return null;
  }
  return LABEL_KEYS_BY_PRESENTATION[presentation][kind];
};

/**
 * Screen-reader reason for a flagged row ("insider", "creator", "excluded"),
 * or `null` when the position has no flags.
 */
export const getPositionFlagAccessibilityReasonKey = (
  position: Position,
): string | null => {
  const kind = getPositionFlagKind(position);
  if (!kind) {
    return null;
  }
  return POSITION_FLAG_ACCESSIBILITY_REASON_KEYS[kind];
};

/**
 * One announcement for a flagged row, matching the V1 profile copy:
 * "Nigel, $693.24, up 47.28%, not counted in P&L, insider".
 *
 * `direction` and `percent` are omitted together when P&L percent is unknown.
 * `flat` reads as "unchanged" rather than "up 0.00%".
 */
export const formatFlaggedPositionAccessibilityLabel = ({
  symbol,
  value,
  direction,
  percent,
  reasonKey,
}: {
  symbol: string;
  value: string;
  direction: FlaggedPositionPnlDirection | null;
  percent: string | null;
  reasonKey: string;
}): string => {
  const reason = strings(reasonKey);
  if (direction == null || percent == null) {
    return strings(
      'social_leaderboard.position_flags.accessibility.not_counted_without_change',
      { symbol, value, reason },
    );
  }
  return strings(
    'social_leaderboard.position_flags.accessibility.not_counted',
    {
      symbol,
      value,
      direction: strings(POSITION_FLAG_DIRECTION_KEYS[direction]),
      percent,
      reason,
    },
  );
};
