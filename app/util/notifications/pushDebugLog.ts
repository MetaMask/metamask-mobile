import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import notifee from '@notifee/react-native';
import Engine from '../../core/Engine';

const STORAGE_KEY = '@push_debug_log_v1';
const MAX_ENTRIES = 100;

// Serialize all writes through a single promise chain to prevent
// concurrent read-modify-write races on AsyncStorage.
let writeChain: Promise<void> = Promise.resolve();

export interface PushDebugEntry {
  id: string;
  timestamp: number;
  type: string;
  summary: string;
  detail?: string;
}

export function logPushEvent(
  type: string,
  summary: string,
  detail?: unknown,
): void {
  const entry: PushDebugEntry = {
    id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    timestamp: Date.now(),
    type,
    summary,
    detail: detail !== undefined ? JSON.stringify(detail) : undefined,
  };
  writeChain = writeChain.then(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const entries: PushDebugEntry[] = raw ? JSON.parse(raw) : [];
      entries.unshift(entry);
      if (entries.length > MAX_ENTRIES) {
        entries.length = MAX_ENTRIES;
      }
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // never throw from a debug logger
    }
  });
}

export async function getPushDebugLog(): Promise<PushDebugEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function clearPushDebugLog(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export interface PushDebugVariable {
  key: string;
  value: string;
}

/**
 * Snapshot of every variable that gates whether a push notification is
 * displayed while the app is in the foreground. Used to prove/disprove
 * hypotheses about *why* foreground push isn't working, without guessing.
 */
export async function getPushDebugVariables(): Promise<PushDebugVariable[]> {
  const vars: PushDebugVariable[] = [];
  const push = (key: string, value: unknown) => {
    vars.push({ key, value: value === undefined ? '(undefined)' : String(value) });
  };

  push('MM_NOTIFICATIONS_UI_ENABLED', process.env.MM_NOTIFICATIONS_UI_ENABLED);

  try {
    const remoteFlags =
      Engine?.context?.RemoteFeatureFlagController?.state?.remoteFeatureFlags;
    push('remoteFlag.assetsNotificationsEnabled', remoteFlags?.assetsNotificationsEnabled);
    push(
      'remoteFlag.assetsEnableNotificationsByDefault',
      remoteFlags?.assetsEnableNotificationsByDefault,
    );
  } catch (e) {
    push('remoteFlags.error', String(e));
  }

  try {
    push(
      'NotificationServicesController.isNotificationServicesEnabled',
      Engine?.context?.NotificationServicesController?.state
        ?.isNotificationServicesEnabled,
    );
  } catch (e) {
    push('NotificationServicesController.error', String(e));
  }

  try {
    push(
      'NotificationServicesPushController.isPushEnabled',
      Engine?.context?.NotificationServicesPushController?.state?.isPushEnabled,
    );
    push(
      'NotificationServicesPushController.fcmToken (last 8)',
      Engine?.context?.NotificationServicesPushController?.state?.fcmToken?.slice?.(
        -8,
      ),
    );
  } catch (e) {
    push('NotificationServicesPushController.error', String(e));
  }

  try {
    const fcmPermission = await messaging().hasPermission();
    push('FCM.hasPermission', fcmPermission);
    push(
      'FCM.isDeviceRegisteredForRemoteMessages',
      messaging().isDeviceRegisteredForRemoteMessages,
    );
  } catch (e) {
    push('FCM.error', String(e));
  }

  try {
    const notifeeSettings = await notifee.getNotificationSettings();
    push('notifee.authorizationStatus', notifeeSettings.authorizationStatus);
  } catch (e) {
    push('notifee.error', String(e));
  }

  return vars;
}
