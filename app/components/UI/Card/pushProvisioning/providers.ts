/**
 * Push provisioning provider factories.
 *
 * The card adapter is selected from the active provider's wallet capabilities.
 * The wallet adapter is selected from the platform.
 */

import { Platform } from 'react-native';
import type { CardProviderCapabilities } from '../../../../core/Engine/controllers/card-controller/provider-types';
import { ControllerCardAdapter, ICardProviderAdapter } from './adapters/card';
import {
  AppleWalletAdapter,
  GoogleWalletAdapter,
  IWalletProviderAdapter,
} from './adapters/wallet';
import type { WalletType } from './types';

export function getCardProvider(
  capabilities: CardProviderCapabilities | null | undefined,
  walletType: WalletType | null,
): ICardProviderAdapter | null {
  if (!capabilities || !walletType) {
    return null;
  }

  const supported =
    walletType === 'apple_wallet'
      ? capabilities.pushProvisioning.applePay
      : capabilities.pushProvisioning.googlePay;

  return supported ? new ControllerCardAdapter() : null;
}

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
