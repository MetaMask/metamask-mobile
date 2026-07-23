import { type FirebaseMessagingTypes } from '@react-native-firebase/messaging';

export type FcmRemoteMessageData = FirebaseMessagingTypes.RemoteMessage['data'];

/** Flattens FCM `data` (`string | object`) to a flat `Record<string, string>` for push analytics: objects JSON-stringified, empties dropped. */
export function toFcmDataStringRecord(
  data: FcmRemoteMessageData,
): Record<string, string> | undefined {
  if (!data) {
    return undefined;
  }

  const entries = Object.entries(data).flatMap(([key, value]) => {
    if (value === undefined || value === null) {
      return [];
    }
    const stringValue =
      typeof value === 'string' ? value : JSON.stringify(value);
    return [[key, stringValue] as const];
  });

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}
