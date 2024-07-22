const getEnvStr = (test: string, prod: string, override?: string) =>
  override ?? (process.env.NODE_ENV !== 'production' ? test : prod);

export const NOTIFICATION_AUTH_URL = getEnvStr(
  'https://authentication.uat-api.cx.metamask.io',
  'https://authentication.api.cx.metamask.io',
  process.env.NOTIFICATION_AUTH_URL,
);
export const USER_STORAGE_SERVICE_URL = getEnvStr(
  'https://user-storage.uat-api.cx.metamask.io',
  'https://user-storage.api.cx.metamask.io',
  process.env.USER_STORAGE_SERVICE_URL,
);
export const TRIGGERS_SERVICE_URL = getEnvStr(
  'https://trigger.uat-api.cx.metamask.io',
  'https://trigger.api.cx.metamask.io',
  process.env.TRIGGERS_SERVICE_URL,
);
export const NOTIFICATIONS_SERVICE_URL = getEnvStr(
  'https://notification.uat-api.cx.metamask.io',
  'https://notification.api.cx.metamask.io',
  process.env.NOTIFICATIONS_SERVICE_URL,
);

export const PUSH_NOTIFICATIONS_SERVICE_URL = getEnvStr(
  'https://push.uat-api.cx.metamask.io',
  'https://push.api.cx.metamask.io',
  process.env.PUSH_NOTIFICATIONS_SERVICE_URL,
);

export const VAPID_KEY = process.env.FCM_VAPID_KEY ?? '';

export const isNotificationsFeatureEnabled = () =>
  process.env.MM_NOTIFICATIONS_UI_ENABLED === 'true';
