import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@push_debug_log_v1';
const MAX_ENTRIES = 100;

export interface PushDebugEntry {
  id: string;
  timestamp: number;
  type: string;
  summary: string;
  detail?: string;
}

export async function logPushEvent(
  type: string,
  summary: string,
  detail?: unknown,
): Promise<void> {
  try {
    const entry: PushDebugEntry = {
      id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      timestamp: Date.now(),
      type,
      summary,
      detail: detail !== undefined ? JSON.stringify(detail) : undefined,
    };
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
