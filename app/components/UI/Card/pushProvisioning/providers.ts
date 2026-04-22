/**
 * Push Provisioning Provider Factory Functions
 *
 * Simple factory functions that return the appropriate card and wallet providers
 * based on user location and platform OS.
 */

import { Platform } from 'react-native';
import { ControllerCardAdapter, ICardProviderAdapter } from './adapters/card';
import {
  AppleWalletAdapter,
  GoogleWalletAdapter,
  IWalletProviderAdapter,
} from './adapters/wallet';
import { CardLocation } from '../types';

/**
 * Get the appropriate card provider adapter based on user location.
 * Uses CardController under the hood (no direct SDK dependency).
 */
export function getCardProvider(
  userCardLocation: CardLocation | null,
): ICardProviderAdapter | null {
  switch (userCardLocation) {
    case 'us':
      return new ControllerCardAdapter();
    case 'international':
    default:
      return null;
  }
}

/**
 * Get the appropriate wallet provider adapter based on platform
 */
export function getWalletProvider(): IWalletProviderAdapter | null {
  switch (Platform.OS) {
    case 'android':
      return new GoogleWalletAdapter();
    case 'ios':
      return new AppleWalletAdapter();
    default:
      return null;
  }
}
