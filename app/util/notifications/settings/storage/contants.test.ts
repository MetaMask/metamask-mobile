import { STORAGE_IDS, STORAGE_TYPES, mapStorageTypeToIds } from './constants';

describe('constants', () => {
  it('should have correct STORAGE_IDS', () => {
    expect(STORAGE_IDS).toEqual({
      NOTIFICATIONS: 'notifications',
      GLOBAL_PUSH_NOTIFICATION_SETTINGS: 'globalNotificationSettings',
      MM_FCM_TOKEN: 'metaMaskFcmToken',
      PUSH_NOTIFICATIONS_PROMPT_COUNT: 'pushNotificationsPromptCount',
      PUSH_NOTIFICATIONS_PROMPT_TIME: 'pushNotificationsPromptTime',
      DEVICE_ID_STORAGE_KEY: 'pns:deviceId',
      DEFAULT_NOTIFICATION_CHANNEL_ID: 'DEFAULT_NOTIFICATION_CHANNEL_ID',
      ANNOUNCEMENT_NOTIFICATION_CHANNEL_ID:
        'ANNOUNCEMENT_NOTIFICATION_CHANNEL_ID',
      DEFAULT_PUSH_NOTIFICATION_CHANNEL_PRIORITY: 'high',
      REQUEST_PERMISSION_ASKED: 'REQUEST_PERMISSION_ASKED',
      REQUEST_PERMISSION_GRANTED: 'REQUEST_PERMISSION_GRANTED',
      NOTIFICATION_DATE_FORMAT: 'DD/MM/YYYY HH:mm:ss',
      NOTIFICATIONS_SETTINGS: 'notifications-settings',
      PN_USER_STORAGE: 'pnUserStorage',
    });
  });

  it('should have correct STORAGE_TYPES', () => {
    expect(STORAGE_TYPES).toEqual({
      STRING: 'string',
      BOOLEAN: 'boolean',
      NUMBER: 'number',
      OBJECT: 'object',
    });
  });

  it('should map storage ids to correct types', () => {
    expect(mapStorageTypeToIds(STORAGE_IDS.NOTIFICATIONS)).toEqual(
      STORAGE_TYPES.OBJECT,
    );
    expect(
      mapStorageTypeToIds(STORAGE_IDS.GLOBAL_PUSH_NOTIFICATION_SETTINGS),
    ).toEqual(STORAGE_TYPES.OBJECT);
    expect(mapStorageTypeToIds(STORAGE_IDS.MM_FCM_TOKEN)).toEqual(
      STORAGE_TYPES.OBJECT,
    );
    expect(
      mapStorageTypeToIds(STORAGE_IDS.PUSH_NOTIFICATIONS_PROMPT_COUNT),
    ).toEqual(STORAGE_TYPES.NUMBER);
    expect(mapStorageTypeToIds(STORAGE_IDS.REQUEST_PERMISSION_ASKED)).toEqual(
      STORAGE_TYPES.BOOLEAN,
    );
    expect(mapStorageTypeToIds(STORAGE_IDS.REQUEST_PERMISSION_GRANTED)).toEqual(
      STORAGE_TYPES.BOOLEAN,
    );
    expect(mapStorageTypeToIds('unknown')).toEqual(STORAGE_TYPES.STRING);
  });
});
