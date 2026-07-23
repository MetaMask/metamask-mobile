type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getDeeplink = (value: unknown): string | undefined =>
  isRecord(value) && typeof value.deeplink === 'string'
    ? value.deeplink
    : undefined;

/**
 * Normalizes the payload shapes used by RNFirebase and locally displayed
 * Notifee notifications into one deeplink contract.
 */
export const extractPushNotificationDeeplink = (
  value: unknown,
): string | undefined => {
  const deeplink = getDeeplink(value);
  if (deeplink || !isRecord(value) || typeof value.dataStr !== 'string') {
    return deeplink;
  }

  try {
    return getDeeplink(JSON.parse(value.dataStr));
  } catch {
    return undefined;
  }
};
