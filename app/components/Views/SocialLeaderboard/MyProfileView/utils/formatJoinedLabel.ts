import dayjs from 'dayjs';
import 'dayjs/locale/de';
import 'dayjs/locale/el';
import 'dayjs/locale/es';
import 'dayjs/locale/fr';
import 'dayjs/locale/hi';
import 'dayjs/locale/id';
import 'dayjs/locale/ja';
import 'dayjs/locale/ko';
import 'dayjs/locale/pt-br';
import 'dayjs/locale/ru';
import 'dayjs/locale/tl-ph';
import 'dayjs/locale/tr';
import 'dayjs/locale/vi';
import 'dayjs/locale/zh-cn';
import relativeTime from 'dayjs/plugin/relativeTime';
import I18n, { strings } from '../../../../../../locales/i18n';

dayjs.extend(relativeTime);

/**
 * App language → dayjs locale. Portuguese in the app is Brazilian, Chinese is
 * simplified, and Filipino ships as `tl-ph`.
 */
const DAYJS_LOCALE_BY_LANGUAGE: Record<string, string> = {
  de: 'de',
  el: 'el',
  en: 'en',
  es: 'es',
  fr: 'fr',
  hi: 'hi',
  id: 'id',
  ja: 'ja',
  ko: 'ko',
  pt: 'pt-br',
  ru: 'ru',
  tl: 'tl-ph',
  tr: 'tr',
  vi: 'vi',
  zh: 'zh-cn',
};

/**
 * `en-US` and `fr_FR` both resolve to the language we ship.
 */
const joinedDayjsLocale = (locale: string): string => {
  const language = locale.toLowerCase().split(/[-_]/)[0];
  return DAYJS_LOCALE_BY_LANGUAGE[language] ?? 'en';
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
 * Durations come from dayjs relative time, not `Intl.NumberFormat` unit
 * style. On Hermes that formatter turns hours and minutes into seconds
 * ("6 hours" → "21,600 seconds") and leaves days singular ("7 day").
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

  const time = joined
    .locale(joinedDayjsLocale(I18n.locale || 'en'))
    .from(now, true);

  return strings('social_leaderboard.my_profile.joined', { time });
};
