interface FirebaseAppOptions {
  appId?: string;
  apiKey?: string;
  databaseURL?: string;
  projectId?: string;
  gaTrackingId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  clientId?: string;
  androidClientId?: string;
  deepLinkURLScheme?: string;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [name: string]: any;
}

const getEnvStr = (test: string, prod: string, override?: string) =>
  override ?? (process.env.NODE_ENV !== 'production' ? test : prod);

const parseConfig = <T>(configStr: string): T | null => {
  try {
    return JSON.parse(configStr) as T;
  } catch {
    return null;
  }
};

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

function getFirebaseConfigEnv(): FirebaseAppOptions | null {
  if (process.env.FCM_CONFIG)
    return parseConfig<FirebaseAppOptions>(process.env.FCM_CONFIG);

  return {
    apiKey: process.env.FCM_CONFIG_API_KEY,
    authDomain: process.env.FCM_CONFIG_AUTH_DOMAIN,
    projectId: process.env.FCM_CONFIG_PROJECT_ID,
    storageBucket: process.env.FCM_CONFIG_STORAGE_BUCKET,
    messagingSenderId: process.env.FCM_CONFIG_MESSAGING_SENDER_ID,
    appId: process.env.FCM_CONFIG_APP_ID,
    measurementId: process.env.FCM_CONFIG_MEASUREMENT_ID,
  };
}

export const FIREBASE_CONFIG = getFirebaseConfigEnv();

export const isNotificationsFeatureEnabled = () =>
  process.env.MM_NOTIFICATIONS_UI_ENABLED === 'true';
