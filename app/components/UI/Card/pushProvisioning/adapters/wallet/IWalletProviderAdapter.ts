/**
 * Wallet Provider Adapter Interface
 *
 * Abstracts wallet SDK interactions for card tokenization and provisioning.
 */

import { PlatformOSType } from 'react-native';
import {
  WalletType,
  WalletEligibility,
  CardTokenStatus,
  ProvisionCardParams,
  ProvisioningResult,
  CardActivationEvent,
} from '../../types';
import { TokenInfo } from './utils';

export interface IWalletProviderAdapter {
  readonly walletType: WalletType;
  readonly platform: PlatformOSType;

  /** Check if the wallet is available on this device */
  checkAvailability(): Promise<boolean>;

  /**
   * Get detailed wallet eligibility including existing card status.
   * Apple matches Immersve passes by the last four digits on the iPhone and a
   * paired Watch when a primary account identifier is provided, and by the
   * iPhone PAN suffix otherwise.
   */
  getEligibility(
    lastFourDigits?: string,
    primaryAccountIdentifier?: string,
  ): Promise<WalletEligibility>;

  /** Check the status of a specific card in the wallet */
  getCardStatus(lastFourDigits: string): Promise<CardTokenStatus>;

  /** Initiate the native provisioning flow */
  provisionCard(params: ProvisionCardParams): Promise<ProvisioningResult>;

  /** Resume provisioning for a card requiring activation (Yellow Path, Android) */
  resumeProvisioning?(
    tokenReferenceId: string,
    cardNetwork: string,
    cardholderName?: string,
    lastFourDigits?: string,
  ): Promise<ProvisioningResult>;

  /** List all tokenized cards in the wallet */
  listTokens?(): Promise<TokenInfo[]>;

  /**
   * Open this card's pass in Apple Wallet on the iPhone.
   * Returns false when no matching iPhone pass is installed.
   */
  openCardInWallet?(lastFourDigits: string): Promise<boolean>;

  /** Add a listener for card activation events; returns unsubscribe function */
  addActivationListener(
    callback: (event: CardActivationEvent) => void,
  ): () => void;
}
