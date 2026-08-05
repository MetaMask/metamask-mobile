type UnknownRecord = Record<string, unknown>;
type PushNotificationData = Record<string, string | object>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isPushNotificationData = (
  value: unknown,
): value is PushNotificationData =>
  isRecord(value) &&
  Object.values(value).every(
    (entry) =>
      typeof entry === 'string' ||
      (typeof entry === 'object' && entry !== null),
  );

const getDeeplink = (value: unknown): string | undefined =>
  isRecord(value) && typeof value.deeplink === 'string'
    ? value.deeplink
    : undefined;

export const extractPushNotificationData = (
  value: unknown,
): PushNotificationData | undefined => {
  if (!isPushNotificationData(value)) {
    return undefined;
  }

  if (typeof value.dataStr !== 'string') {
    return value;
  }

  try {
    const data = JSON.parse(value.dataStr);
    return isPushNotificationData(data) ? data : value;
  } catch {
    return value;
  }
};

/**
 * Normalizes the payload shapes used by RNFirebase and locally displayed
 * Notifee notifications into one deeplink contract.
 */
export const extractPushNotificationDeeplink = (
  value: unknown,
): string | undefined => {
  const deeplink = getDeeplink(value);
  if (deeplink) {
    return deeplink;
  }

  return getDeeplink(extractPushNotificationData(value));
};
