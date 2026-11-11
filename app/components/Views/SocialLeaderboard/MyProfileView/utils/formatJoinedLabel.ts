import dayjs from 'dayjs';
import I18n, { strings } from '../../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../../util/intl';

/**
 * Calendar units, longest first. The first unit with a non-zero elapsed count
 * is the one shown on the joined line.
 */
const JOINED_UNITS = [
  'year',
  'month',
  'day',
  'hour',
  'minute',
  'second',
] as const;

type JoinedUnit = (typeof JOINED_UNITS)[number];

/**
 * Localized count and unit ("3 days", "3 jours").
 *
 * The surrounding sentence lives in the translation, so this must not include
 * a relative wrapper such as "ago" or "il y a". Those wrappers sit in different
 * places depending on the language.
 */
const formatJoinedQuantity = (
  count: number,
  unit: JoinedUnit,
  locale: string,
): string => {
  try {
    return getIntlNumberFormatter(locale, {
      style: 'unit',
      unit,
      unitDisplay: 'long',
    }).format(count);
  } catch {
    // Some Intl builds reject unit style. Keep a readable quantity so the
    // profile header still renders.
    return `${count} ${unit}${count === 1 ? '' : 's'}`;
  }
};

const selectJoinedQuantity = (
  joined: dayjs.Dayjs,
  now: Date,
): { count: number; unit: JoinedUnit } => {
  const reference = dayjs(now);

  for (const unit of JOINED_UNITS) {
    const count = Math.abs(reference.diff(joined, unit));
    if (unit === 'second' || count >= 1) {
      return {
        count: unit === 'second' ? Math.max(count, 1) : count,
        unit,
      };
    }
  }

  return { count: 1, unit: 'second' };
};

/**
 * Joined line under the Social v1 profile header (your profile and another
 * trader's).
 *
 * The whole sentence is one translated string. `time` is only the localized
 * duration, so "Joined {{time}} ago" and "Inscrit depuis {{time}}" both read
 * naturally. Passing a full relative phrase ("3 days ago", "il y a 3 jours")
 * into the French sentence does not.
 *
 * @param joinedAt - Profile creation time, as an ISO timestamp.
 * @param now - Clock used to measure the duration. Defaults to the current time.
 * @returns The localized sentence, or null when `joinedAt` is missing or not a date.
 */
export const formatJoinedLabel = (
  joinedAt: string | null | undefined,
  now: Date = new Date(),
): string | null => {
  if (!joinedAt?.trim()) {
    return null;
  }

  const joined = dayjs(joinedAt);
  if (!joined.isValid()) {
    return null;
  }

  const { count, unit } = selectJoinedQuantity(joined, now);
  const locale = I18n.locale || 'en';

  return strings('social_leaderboard.my_profile.joined', {
    time: formatJoinedQuantity(count, unit, locale),
  });
};
