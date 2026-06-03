import { type FirebaseMessagingTypes } from '@react-native-firebase/messaging';

export type FcmRemoteMessageData = FirebaseMessagingTypes.RemoteMessage['data'];

/**
 * FCM `data` values are typed as `string | object` by React Native Firebase.
 * push-services analytics helpers expect a flat `Record<string, string>`, so
 * object values are JSON-stringified and empty entries dropped.
 */
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
