/* eslint-disable arrow-body-style */
/**
 * Push Provisioning Service
 *
 * Main orchestration service for push provisioning operations.
 * Coordinates between card provider adapters and wallet provider adapters.
 */

import {
  ProvisioningResult,
  ProvisioningError,
  ProvisioningErrorCode,
  CardDisplayInfo,
  CardActivationEvent,
  UserAddress,
  CardDetails,
} from '../types';
import { ICardProviderAdapter } from '../adapters/card/ICardProviderAdapter';
import { IWalletProviderAdapter } from '../adapters/wallet/IWalletProviderAdapter';
import { strings } from '../../../../../../locales/i18n';
import { getWalletName } from '../constants';

/**
 * Options for initiating provisioning
 */
export interface ProvisioningOptions {
  /** Card details from CardHome (includes holderName, panLast4, status, etc.) */
  cardDetails: CardDetails;
  /** User address for Google Wallet provisioning (from user profile) */
  userAddress?: UserAddress;
}

/**
 * Push Provisioning Service
 *
 * This service orchestrates the push provisioning flow by:
 * 1. Checking wallet availability and eligibility
 * 2. Getting wallet-specific data
 * 3. Coordinating with card provider for payload encryption
 * 4. Initiating the native provisioning flow
 */
export class PushProvisioningService {
  private cardAdapter: ICardProviderAdapter | null;
  private walletAdapter: IWalletProviderAdapter | null;

  constructor(
    cardAdapter: ICardProviderAdapter | null,
    walletAdapter: IWalletProviderAdapter | null,
  ) {
    this.cardAdapter = cardAdapter;
    this.walletAdapter = walletAdapter;
  }

  /**
   * Initiate push provisioning for a card
   *
   * This is the main entry point for provisioning a card to a mobile wallet.
   */
  async initiateProvisioning(
    options: ProvisioningOptions,
  ): Promise<ProvisioningResult> {
    const { cardDetails, userAddress } = options;

    try {
      // 1. Validate adapters are available
      if (!this.cardAdapter) {
        throw new ProvisioningError(
          ProvisioningErrorCode.CARD_PROVIDER_NOT_FOUND,
          strings('card.push_provisioning.error_card_provider_not_found'),
        );
      }

      if (!this.walletAdapter) {
        throw new ProvisioningError(
          ProvisioningErrorCode.WALLET_NOT_AVAILABLE,
          strings('card.push_provisioning.error_wallet_not_available', {
            walletName: getWalletName(),
          }),
        );
      }

      // 2. Check wallet availability
      const walletAvailable = await this.walletAdapter.checkAvailability();
      if (!walletAvailable) {
        throw new ProvisioningError(
          ProvisioningErrorCode.WALLET_NOT_AVAILABLE,
          strings('card.push_provisioning.error_wallet_not_available', {
            walletName: getWalletName(),
          }),
        );
      }

      const { id: cardId, holderName, panLast4, expiryDate } = cardDetails;

      // 3. Build CardDisplayInfo from card details
      const cardDisplayInfo: CardDisplayInfo = {
        cardId,
        cardholderName: holderName,
        expiryDate,
        lastFourDigits: panLast4,
        cardNetwork: 'MASTERCARD',
        cardDescription: `MetaMask Card ending in ${panLast4}`,
      };

      // 5. Provision the card
      return await this.provisionCard(
        this.cardAdapter,
        this.walletAdapter,
        cardDisplayInfo,
        userAddress,
      );
    } catch (error) {
      if (error instanceof ProvisioningError) {
        return {
          status: 'error',
          error,
        };
      }

      return {
        status: 'error',
        error: new ProvisioningError(
          ProvisioningErrorCode.UNKNOWN_ERROR,
          error instanceof Error
            ? error.message
            : strings('card.push_provisioning.error_unknown'),
          error instanceof Error ? error : undefined,
        ),
      };
    }
  }

  /**
   * Provision card to wallet
   *
   * Handles platform-specific provisioning flows:
   *
   * Google Wallet (Android):
   * 1. Send card ID to card provider API
   * 2. Get opaque payment card from card provider
   * 3. Call wallet adapter to push tokenize
   *
   * Apple Pay (iOS):
   * 1. Call provisionCard with card data and issuerEncryptCallback
   * 2. PassKit presents UI and returns nonce, certificates via callback
   * 3. Callback calls card provider to get encrypted payload
   * 4. Return encrypted payload to PassKit
   */
  private async provisionCard(
    cardAdapter: ICardProviderAdapter,
    walletAdapter: IWalletProviderAdapter,
    cardDisplayInfo: CardDisplayInfo,
    userAddress?: UserAddress,
  ): Promise<ProvisioningResult> {
    // Handle Apple Pay flow (iOS)
    if (walletAdapter.walletType === 'apple_wallet') {
      return this.provisionCardToAppleWallet(
        cardAdapter,
        walletAdapter,
        cardDisplayInfo,
      );
    }

    // Handle Google Wallet flow (Android)
    return this.provisionCardToGoogleWallet(
      cardAdapter,
      walletAdapter,
      cardDisplayInfo,
      userAddress,
    );
  }

  /**
   * Provision card to Google Wallet
   */
  private async provisionCardToGoogleWallet(
    cardAdapter: ICardProviderAdapter,
    walletAdapter: IWalletProviderAdapter,
    cardDisplayInfo: CardDisplayInfo,
    userAddress?: UserAddress,
  ): Promise<ProvisioningResult> {
    const response = await cardAdapter.getOpaquePaymentCard();

    if (!response.success || !response.encryptedPayload?.opaquePaymentCard) {
      throw new ProvisioningError(
        ProvisioningErrorCode.ENCRYPTION_FAILED,
        strings('card.push_provisioning.error_encryption_failed'),
      );
    }

    // 3. Provision the card with user address from CardHome
    return await walletAdapter.provisionCard({
      cardNetwork: cardDisplayInfo.cardNetwork,
      cardholderName: cardDisplayInfo.cardholderName,
      lastFourDigits: cardDisplayInfo.lastFourDigits,
      cardDescription: cardDisplayInfo.cardDescription,
      encryptedPayload: response.encryptedPayload,
      userAddress,
    });
  }

  /**
   * Provision card to Apple Wallet
   *
   * Apple Pay uses a callback-based flow where PassKit provides
   * cryptographic data (nonce, certificates) that must be sent
   * to the card provider to get the encrypted payload.
   */
  private async provisionCardToAppleWallet(
    cardAdapter: ICardProviderAdapter,
    walletAdapter: IWalletProviderAdapter,
    cardDisplayInfo: CardDisplayInfo,
  ): Promise<ProvisioningResult> {
    if (!cardAdapter.getApplePayEncryptedPayload) {
      throw new ProvisioningError(
        ProvisioningErrorCode.CARD_NOT_ELIGIBLE,
        strings('card.push_provisioning.error_card_not_eligible'),
      );
    }

    const getEncryptedPayload =
      cardAdapter.getApplePayEncryptedPayload.bind(cardAdapter);

    const issuerEncryptCallback = async (
      nonce: string,
      nonceSignature: string,
      certificates: string[],
    ) => {
      return await getEncryptedPayload(nonce, nonceSignature, certificates);
    };

    return await walletAdapter.provisionCard({
      cardNetwork: cardDisplayInfo.cardNetwork,
      cardholderName: cardDisplayInfo.cardholderName,
      lastFourDigits: cardDisplayInfo.lastFourDigits,
      cardDescription: cardDisplayInfo.cardDescription,
      encryptedPayload: {}, // Empty for Apple Pay - data comes via callback
      issuerEncryptCallback,
    });
  }

  /**
   * Add a listener for card activation events
   */
  addActivationListener(
    callback: (event: CardActivationEvent) => void,
  ): () => void {
    if (!this.walletAdapter) {
      return () => undefined;
    }
    return this.walletAdapter.addActivationListener(callback);
  }
}

/**
 * Create a PushProvisioningService instance with the given adapters
 */
export function createPushProvisioningService(
  cardAdapter: ICardProviderAdapter | null,
  walletAdapter: IWalletProviderAdapter | null,
): PushProvisioningService {
  return new PushProvisioningService(cardAdapter, walletAdapter);
}
