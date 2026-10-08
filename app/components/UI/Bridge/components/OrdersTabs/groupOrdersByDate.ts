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
 * Groups items into per-day sections ("Today", "Aug 13, 2026", ...) in order
 * of first appearance. Each item keeps its index in `items`.
 *
 * @param items - The items to group, usually already sorted newest first.
 * @param getItemDate - Returns an item's ISO-8601 timestamp.
 * @param now - The reference time used to decide what "Today" is.
 * @returns The sections, in order of first appearance.
 */
export function groupOrdersByDate<T>(
  items: T[],
  getItemDate: (item: T) => string | undefined,
  now: Date = new Date(),
): OrdersDateSection<T>[] {
  const todayKey = getLocalDayKey(now);
  const sections = new Map<string, OrdersDateSection<T>>();

  items.forEach((item, index) => {
    const timestamp = getItemDate(item);
    const date = timestamp ? new Date(timestamp) : undefined;
    const isValidDate = date !== undefined && !Number.isNaN(date.getTime());
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
  });

  return Array.from(sections.values());
}
