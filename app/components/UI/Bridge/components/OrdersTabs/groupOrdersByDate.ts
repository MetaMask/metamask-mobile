import I18n, { strings } from '../../../../../../locales/i18n';
import { getIntlDateTimeFormatter } from '../../../../../util/intl';

export interface OrdersDateSection<T> {
  key: string;
  /**
   * Undefined for items whose date is missing or unparsable.
   */
  title?: string;
  items: { item: T; index: number }[];
}

const UNDATED_SECTION_KEY = 'undated';

function getLocalDayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatSectionTitle(date: Date, todayKey: string): string {
  if (getLocalDayKey(date) === todayKey) {
    return strings('bridge.orders.today');
  }

  return getIntlDateTimeFormatter(I18n.locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

/**
 * Groups items into per-day sections ("Today", "Aug 13, 2026", ...), newest
 * day first, with items newest first within each day. Undated items go last,
 * in input order. Each item keeps its index in `items`.
 *
 * The input order is not trusted: `getItemDate` may return a different
 * timestamp than the one the API sorts by (e.g. history groups by close time
 * while pages are sorted by creation time).
 *
 * @param items - The items to group.
 * @param getItemDate - Returns an item's ISO-8601 timestamp.
 * @param now - The reference time used to decide what "Today" is.
 * @returns The sections, newest day first.
 */
export function groupOrdersByDate<T>(
  items: T[],
  getItemDate: (item: T) => string | undefined,
  now: Date = new Date(),
): OrdersDateSection<T>[] {
  const todayKey = getLocalDayKey(now);
  const sections = new Map<string, OrdersDateSection<T>>();
  const itemTimes = new Map<number, number>();
  const sectionTimes = new Map<string, number>();

  items.forEach((item, index) => {
    const timestamp = getItemDate(item);
    const date = timestamp ? new Date(timestamp) : undefined;
    const time = date?.getTime();
    const isValidDate =
      date !== undefined && time !== undefined && !Number.isNaN(time);
    const key = isValidDate ? getLocalDayKey(date) : UNDATED_SECTION_KEY;

    let section = sections.get(key);
    if (!section) {
      section = {
        key,
        title: isValidDate ? formatSectionTitle(date, todayKey) : undefined,
        items: [],
      };
      sections.set(key, section);
    }

    section.items.push({ item, index });

    if (isValidDate) {
      itemTimes.set(index, time);
      sectionTimes.set(key, Math.max(sectionTimes.get(key) ?? time, time));
    }
  });

  const sortedSections = Array.from(sections.values()).sort(
    (a, b) =>
      (sectionTimes.get(b.key) ?? -Infinity) -
      (sectionTimes.get(a.key) ?? -Infinity),
  );

  sortedSections.forEach((section) => {
    if (section.key !== UNDATED_SECTION_KEY) {
      section.items.sort(
        (a, b) => (itemTimes.get(b.index) ?? 0) - (itemTimes.get(a.index) ?? 0),
      );
    }
  });

  return sortedSections;
}
