import { type FirebaseMessagingTypes } from '@react-native-firebase/messaging';

import { toFcmDataStringRecord } from './fcm-data';

describe('toFcmDataStringRecord', () => {
  it('returns undefined for missing data', () => {
    expect(toFcmDataStringRecord(undefined)).toBeUndefined();
  });

  it('returns undefined for empty data', () => {
    expect(toFcmDataStringRecord({})).toBeUndefined();
  });

  it('passes through string values unchanged', () => {
    expect(
      toFcmDataStringRecord({
        notification_id: 'id-1',
        deeplink: 'https://example.com',
      }),
    ).toStrictEqual({
      notification_id: 'id-1',
      deeplink: 'https://example.com',
    });
  });

  it('JSON-stringifies object values', () => {
    const data = {
      notification_id: 'id-1',
      metadata: { position_type: 'short', asset: 'POL' },
    } as unknown as FirebaseMessagingTypes.RemoteMessage['data'];

    expect(toFcmDataStringRecord(data)).toStrictEqual({
      notification_id: 'id-1',
      metadata: '{"position_type":"short","asset":"POL"}',
    });
  });

  it('omits null and undefined values', () => {
    const data = {
      notification_id: 'id-1',
      missing: undefined,
      empty: null,
    } as unknown as FirebaseMessagingTypes.RemoteMessage['data'];

    expect(toFcmDataStringRecord(data)).toStrictEqual({
      notification_id: 'id-1',
    });
  });
});
