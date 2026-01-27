/**
 * Push Provisioning Provider Factory Functions
 *
 * Simple factory functions that return the appropriate card and wallet providers
 * based on user location and platform OS.
 *
 * ## Development Mode
 *
 * In development (`__DEV__`), you can use mock adapters by setting environment variables:
 * - `MOCK_WALLET_PROVIDER=true` - Uses MockWalletAdapter instead of GoogleWalletAdapter
 *
 * This is useful when testing on devices without Google's TapAndPay allowlist.
 */

import { Platform } from 'react-native';
import { CardSDK } from '../sdk/CardSDK';
import { GalileoCardAdapter, ICardProviderAdapter } from './adapters/card';
import {
  GoogleWalletAdapter,
  MockWalletAdapter,
  IWalletProviderAdapter,
} from './adapters/wallet';
import { CardLocation } from '../types';
import Logger from '../../../../util/Logger';

/**
 * Get the appropriate card provider adapter based on user location
 *
 * @param userCardLocation - The user's card location ('us' or 'international')
 * @param cardSDK - The CardSDK instance
 * @returns The card provider adapter for the user's location
 */
export function getCardProvider(
  userCardLocation: CardLocation,
  cardSDK: CardSDK,
): ICardProviderAdapter | null {
  switch (userCardLocation) {
    case 'us':
      return new GalileoCardAdapter(cardSDK);
    case 'international':
    default:
      return null;
  }
}

/**
 * Check if mock wallet provider should be used
 *
 * In development mode, the mock can be enabled by setting MOCK_WALLET_PROVIDER=true
 * in the environment or by calling setUseMockWalletProvider(true).
 */
let useMockWalletProviderOverride: boolean | null = null;

/**
 * Programmatically enable/disable mock wallet provider
 *
 * This is useful for testing or toggling the mock at runtime.
 * Set to `null` to use the default environment variable behavior.
 *
 * @param enabled - true to use mock, false to use real, null to use env var
 */
export function setUseMockWalletProvider(enabled: boolean | null): void {
  // Only update and log if the value actually changes
  if (useMockWalletProviderOverride === enabled) {
    return;
  }

  useMockWalletProviderOverride = enabled;
  if (__DEV__) {
    Logger.log(
      `[PushProvisioning] Mock wallet provider ${enabled === null ? 'reset to env var' : enabled ? 'enabled' : 'disabled'}`,
    );
  }
}

/**
 * Check if mock wallet provider is enabled
 */
function shouldUseMockWalletProvider(): boolean {
  // Check override first
  if (useMockWalletProviderOverride !== null) {
    return useMockWalletProviderOverride;
  }

  // Only use mock in development mode
  if (!__DEV__) {
    return false;
  }

  // Check environment variable
  const envValue = process.env.MOCK_WALLET_PROVIDER;
  return envValue === 'true' || envValue === '1';
}

/**
 * Get the appropriate wallet provider adapter based on platform OS
 *
 * In development mode, returns MockWalletAdapter if MOCK_WALLET_PROVIDER=true
 * or if setUseMockWalletProvider(true) was called.
 *
 * @returns The wallet provider adapter for the current platform, or null if not supported
 */
export function getWalletProvider(): IWalletProviderAdapter | null {
  // Check if mock should be used (dev mode only)
  const useMock = shouldUseMockWalletProvider();

  if (__DEV__) {
    Logger.log(
      `[getWalletProvider] useMock=${useMock}, override=${useMockWalletProviderOverride}, env=${process.env.MOCK_WALLET_PROVIDER}`,
    );
  }

  if (useMock) {
    if (__DEV__) {
      Logger.log('[getWalletProvider] Using MockWalletAdapter');
    }
    return new MockWalletAdapter({
      isAvailable: true,
      canAddCard: true,
    });
  }

  switch (Platform.OS) {
    case 'android':
      if (__DEV__) {
        Logger.log('[getWalletProvider] Using GoogleWalletAdapter');
      }
      return new GoogleWalletAdapter();
    case 'ios':
    default:
      return null;
  }
}
