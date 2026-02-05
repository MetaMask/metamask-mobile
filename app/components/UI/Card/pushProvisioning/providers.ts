/**
 * Push Provisioning Provider Factory Functions
 *
 * Simple factory functions that return the appropriate card and wallet providers
 * based on user location and platform OS.
 */

import { Platform } from 'react-native';
import { CardSDK } from '../sdk/CardSDK';
import { GalileoCardAdapter, ICardProviderAdapter } from './adapters/card';
import {
  GoogleWalletAdapter,
  AppleWalletAdapter,
  IWalletProviderAdapter,
} from './adapters/wallet';
import { CardLocation } from '../types';

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
 * Get the appropriate wallet provider adapter based on platform OS
 *
 * @returns The wallet provider adapter for the current platform, or null if not supported
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
