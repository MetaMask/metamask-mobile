import dayjs from 'dayjs';
import { formatMenuItemDate, parseNotification } from './common';
import { strings } from '../../../../locales/i18n';
import { FirebaseMessagingTypes } from '@react-native-firebase/messaging';

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

  it('parses notification', () => {
    const notification = {
      data: {
        data: {
        type: 'eth_received',
          data: { kind: 'eth_received' },
        },
      },
    } as unknown as FirebaseMessagingTypes.RemoteMessage;

    expect(parseNotification(notification)).toEqual({
      type: 'eth_received',
      transaction: { kind: 'eth_received' },
      duration: 5000,
    });
  });
});


