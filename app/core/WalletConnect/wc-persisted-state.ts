import AsyncStorage from '@react-native-async-storage/async-storage';
import StorageWrapper from '../../store/storage-wrapper';
import AppConstants from '../AppConstants';
import DevLogger from '../SDKConnect/utils/DevLogger';

/**
 * WalletConnect stores (`@walletconnect/core` / `sign-client` `Store`) persist to
 * AsyncStorage through `@walletconnect/keyvaluestorage` under
 * `wc@2:<core|client>:<storeVersion><customStoragePrefix>//<name>`, for example
 * `wc@2:client:0.3//session` and `wc@2:core:0.3//pairing`. Matched by pattern
 * rather than exact key so a store version bump can't silently hide existing
 * sessions.
 */
export const WALLET_CONNECT_STATE_KEY_PATTERN =
  /^wc@2:(client|core):[^/]*\/\/(session|pairing|proposal|subscription)$/;

const hasEntries = (raw: string | null | undefined): boolean => {
  if (raw === null || raw === undefined || raw === '') return false;
  try {
    const value: unknown = JSON.parse(raw);
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === 'object')
      return Object.keys(value).length > 0;
    // Stores are always arrays; anything else is unexpected, so assume state.
    return true;
  } catch {
    return true;
  }
};

/**
 * Whether this install has anything WalletConnect must be running for at
 * unlock: a session, a pairing (including one whose session never settled), a
 * pending proposal or relay subscription, or a deeplink session the app tracks.
 * Reads storage only; the SDK is not loaded. Any read or parse problem counts as
 * "has state", so the result can only ever start WalletConnect as before.
 */
export async function hasPersistedWalletConnectState(): Promise<boolean> {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((key) =>
      WALLET_CONNECT_STATE_KEY_PATTERN.test(key),
    );
    if (keys.length > 0) {
      const entries = await AsyncStorage.multiGet(keys);
      if (entries.some(([, raw]) => hasEntries(raw))) return true;
    }
    const deeplinkSessions = await StorageWrapper.getItem(
      AppConstants.WALLET_CONNECT.DEEPLINK_SESSIONS,
    );
    return hasEntries(deeplinkSessions);
  } catch (error) {
    DevLogger.log(
      'WC2::hasPersistedWalletConnectState failed, starting WalletConnect',
      error,
    );
    return true;
  }
}
