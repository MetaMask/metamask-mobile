import {
  extractPushNotificationData,
  extractPushNotificationDeeplink,
} from './pushNotificationDeeplink';

describe('extractPushNotificationData', () => {
  it('returns flat RNFirebase data unchanged', () => {
    const data = {
      deeplink: 'https://link.metamask.io/rewards',
      notification_id: 'test-notification-id',
    };

    const result = extractPushNotificationData(data);

    expect(result).toStrictEqual(data);
  });

  it('extracts serialized Notifee data', () => {
    const notificationData = {
      deeplink: 'https://link.metamask.io/rewards',
      notification_id: 'test-notification-id',
    };

    const result = extractPushNotificationData({
      dataStr: JSON.stringify(notificationData),
    });

    expect(result).toStrictEqual(notificationData);
  });

  it('returns the wrapper for malformed serialized data', () => {
    const data = { dataStr: '{not-json' };

    const result = extractPushNotificationData(data);

    expect(result).toStrictEqual(data);
  });
});

describe('extractPushNotificationDeeplink', () => {
  it('extracts a flat RNFirebase deeplink', () => {
    const data = {
      deeplink: 'https://link.metamask.io/rewards',
      metadata: '{}',
    };

    const result = extractPushNotificationDeeplink(data);

    expect(result).toBe('https://link.metamask.io/rewards');
  });

  it('extracts a deeplink from serialized Notifee data', () => {
    const data = {
      dataStr: JSON.stringify({
        deeplink: 'https://link.metamask.io/rewards',
      }),
    };

    const result = extractPushNotificationDeeplink(data);

    expect(result).toBe('https://link.metamask.io/rewards');
  });

  it('returns undefined for malformed serialized data', () => {
    const data = { dataStr: '{not-json' };

    const result = extractPushNotificationDeeplink(data);

    expect(result).toBeUndefined();
  });
});
