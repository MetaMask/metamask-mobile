// eslint-disable-next-line import/prefer-default-export
export const STORAGE_IDS = {
  NOTIFICATIONS: 'notifications',
  GLOBAL_PUSH_NOTIFICATION_SETTINGS: 'globalNotificationSettings',
  MM_FCM_TOKEN: 'metaMaskFcmToken',
  PUSH_NOTIFICATIONS_PROMPT_COUNT: 'pushNotificationsPromptCount',
  PUSH_NOTIFICATIONS_PROMPT_TIME: 'pushNotificationsPromptTime',
  DEVICE_ID_STORAGE_KEY: 'pns:deviceId',
  ANDROID_DEFAULT_CHANNEL_ID: 'ANDROID_DEFAULT_CHANNEL_ID',
  DEFAULT_PUSH_NOTIFICATION_CHANNEL_PRIORITY: 'high',
  REQUEST_PERMISSION_ASKED: 'REQUEST_PERMISSION_ASKED',
  REQUEST_PERMISSION_GRANTED: 'REQUEST_PERMISSION_GRANTED',
  NOTIFICATION_DATE_FORMAT: 'DD/MM/YYYY HH:mm:ss',
};

export const STORAGE_TYPES = {
  STRING: 'string',
  BOOLEAN: 'boolean',
  NUMBER: 'number',
  OBJECT: 'object',
};

// Map all non string storage ids to their respective types
export const mapStorageTypeToIds = (id: string) => {
  switch (id) {
    case STORAGE_IDS.NOTIFICATIONS:
      return STORAGE_TYPES.OBJECT;
    case STORAGE_IDS.GLOBAL_PUSH_NOTIFICATION_SETTINGS:
      return STORAGE_TYPES.OBJECT;
    case STORAGE_IDS.MM_FCM_TOKEN:
      return STORAGE_TYPES.OBJECT;
    case STORAGE_IDS.PUSH_NOTIFICATIONS_PROMPT_COUNT:
      return STORAGE_TYPES.NUMBER;
    case STORAGE_IDS.REQUEST_PERMISSION_ASKED:
      return STORAGE_TYPES.BOOLEAN;
    case STORAGE_IDS.REQUEST_PERMISSION_GRANTED:
      return STORAGE_TYPES.BOOLEAN;
    default:
      return STORAGE_TYPES.STRING;
  }
};
