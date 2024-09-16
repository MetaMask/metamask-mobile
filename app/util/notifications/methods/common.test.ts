import dayjs from 'dayjs';
import { formatMenuItemDate } from './common';
import { strings } from '../../../../locales/i18n';

describe('formatMenuItemDate', () => {
  it('returns "No date" if date is not provided', () => {
    expect(formatMenuItemDate()).toBe(strings('notifications.no_date'));
  });

  it('formats date to "HH:mm" if it is a current day', () => {
    const date = dayjs().toDate();
    expect(formatMenuItemDate(date)).toBe(dayjs().format('HH:mm'));
  });

  it('formats date to "Yesterday" if it is yesterday', () => {
    const date = dayjs().subtract(1, 'day').toDate();
    expect(formatMenuItemDate(date)).toBe(strings('notifications.yesterday'));
  });
});
