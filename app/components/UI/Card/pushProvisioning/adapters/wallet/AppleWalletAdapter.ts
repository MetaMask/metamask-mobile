/**
 * Apple Wallet Provider Adapter
 *
 * Implementation of IWalletProviderAdapter for Apple Wallet on iOS.
 * Wraps the react-native-wallet library's iOS-specific methods.
 *
 * Currently only Mastercard is supported.
 */

import { Platform, PlatformOSType } from 'react-native';
import type {
  IOSCardData,
  IOSWalletPass,
} from '@expensify/react-native-wallet';
import {
  WalletType,
  ProvisionCardParams,
  ProvisioningResult,
  ProvisioningErrorCode,
  ApplePayEncryptedPayload,
  WalletEligibility,
  WalletPassDevice,
  CardTokenStatus,
} from '../../types';
import { IWalletProviderAdapter } from './IWalletProviderAdapter';
import { BaseWalletAdapter } from './BaseWalletAdapter';
import {
  mapTokenizationStatus,
  mapCardStatus,
  createErrorResult,
  logAdapterError,
} from './utils';
import { strings } from '../../../../../../../locales/i18n';

/**
 * Apple Wallet Provider Adapter
 *
 * This adapter handles card provisioning to Apple Wallet on iOS devices.
 * It uses the react-native-wallet library to interact with the PassKit SDK.
 *
 * Apple Pay In-App Provisioning Flow:
 * 1. Check if Apple Wallet is available on the device (PKAddPaymentPassViewController)
 * 2. Present the Add Payment Pass view to the user
 * 3. PassKit SDK returns nonce, nonceSignature, and certificates
 * 4. Send these to the card provider API to get encrypted payload
 * 5. Return encrypted payload to PassKit to complete provisioning
 * 6. Apple Wallet adds the card
 */
export class AppleWalletAdapter
  extends BaseWalletAdapter
  implements IWalletProviderAdapter
{
  readonly walletType: WalletType = 'apple_wallet';
  readonly platform: PlatformOSType = 'ios';

  constructor() {
    super();
    // Start loading the module immediately but don't block
    this.moduleLoadPromise = this.initializeWalletModule();
  }

  protected getAdapterName(): string {
    return 'AppleWalletAdapter';
  }

  protected getExpectedPlatform(): PlatformOSType {
    return 'ios';
  }

  /**
   * Decide whether Add to Apple Wallet should stay visible.
   *
   * Immersve sends a series id that is not the identifier on the installed
   * pass, so passes are matched by the last four digits on the iPhone and a
   * paired Watch. A match counts as present in every state except
   * deactivated. Add stays available until every paired device already has
   * the card. Without an identifier or last four, or when the pass APIs
   * fail, eligibility falls back to the iPhone PAN suffix check.
   */
  override async getEligibility(
    lastFourDigits?: string,
    primaryAccountIdentifier?: string,
  ): Promise<WalletEligibility> {
    if (!primaryAccountIdentifier || !lastFourDigits) {
      return super.getEligibility(lastFourDigits);
    }

    const isAvailable = await this.checkAvailability();
    if (!isAvailable) {
      return super.getEligibility(lastFourDigits);
    }

    try {
      const wallet = await this.getWalletModule();
      const passes = await wallet.listAppleWalletPasses();
      const matching = passes.filter(
        (pass) =>
          this.suffixMatches(pass.lastDigits, lastFourDigits) &&
          pass.activationState !== 'deactivated',
      );
      const phonePass = matching.find((pass) => !pass.isRemote);
      const watchPass = matching.find((pass) => pass.isRemote);
      const phoneStatus = this.passStatus(phonePass);
      const watchStatus = this.passStatus(watchPass);
      const pendingVerificationDevices: WalletPassDevice[] = [];
      if (phoneStatus === 'requires_activation') {
        pendingVerificationDevices.push('phone');
      }
      if (watchStatus === 'requires_activation') {
        pendingVerificationDevices.push('watch');
      }

      const canAddCard = await this.canAddToAnotherDevice(
        wallet,
        phonePass?.primaryAccountIdentifier || primaryAccountIdentifier,
        Boolean(phonePass),
        Boolean(watchPass),
      );
      const existingCardStatus = phoneStatus ?? watchStatus;
      const action = canAddCard
        ? { canAddCard: true, recommendedAction: 'add_card' as const }
        : this.determineActionForStatus(existingCardStatus);

      return {
        isAvailable: true,
        existingCardStatus,
        devices: {
          ...(phoneStatus ? { phone: phoneStatus } : {}),
          ...(watchStatus ? { watch: watchStatus } : {}),
        },
        pendingVerificationDevices,
        ...action,
      };
    } catch (error) {
      logAdapterError(this.getAdapterName(), 'getEligibility', error);
      return super.getEligibility(lastFourDigits);
    }
  }

  private suffixMatches(
    lastDigits: string | undefined,
    lastFourDigits: string,
  ): boolean {
    return Boolean(lastDigits?.endsWith(lastFourDigits));
  }

  private passStatus(
    pass: IOSWalletPass | undefined,
  ): CardTokenStatus | undefined {
    if (!pass) {
      return undefined;
    }
    return mapCardStatus(pass.activationState);
  }

  /**
   * No iPhone pass means the phone can still take the card.
   * Passes on both devices means there is nowhere left to add it.
   * An iPhone pass without a Watch pass depends on whether a paired Watch
   * can still take the card.
   */
  /**
   * Open the iPhone pass for this card. Prefers a pass that still needs
   * verification. Returns false when that pass is not installed.
   */
  async openCardInWallet(lastFourDigits: string): Promise<boolean> {
    try {
      const wallet = await this.getWalletModule();
      const opened = await wallet.presentAppleWalletPass(lastFourDigits);
      return opened;
    } catch (error) {
      logAdapterError(this.getAdapterName(), 'openCardInWallet', error);
      return false;
    }
  }

  private async canAddToAnotherDevice(
    wallet: typeof import('@expensify/react-native-wallet'),
    primaryAccountIdentifier: string,
    onPhone: boolean,
    onWatch: boolean,
  ): Promise<boolean> {
    if (!onPhone) {
      return true;
    }
    if (onWatch) {
      return false;
    }
    return wallet.canAddCardToAppleWallet(primaryAccountIdentifier);
  }

  /**
   * Provision a card to Apple Wallet
   *
   * This uses the PassKit SDK's in-app provisioning flow with a callback
   * pattern. The SDK presents the Add Payment Pass view, which returns
   * cryptographic data (nonce, certificates) that must be sent to the
   * card provider to get the encrypted payload.
   *
   * @param params - The provisioning parameters
   * @returns Promise resolving to the provisioning result
   */
  async provisionCard(
    params: ProvisionCardParams,
  ): Promise<ProvisioningResult> {
    if (Platform.OS !== 'ios') {
      return {
        status: 'error',
        error: this.createPlatformNotSupportedError(),
      };
    }

    // Apple Pay requires the issuer encrypt callback to be provided
    const { issuerEncryptCallback } = params;
    if (!issuerEncryptCallback) {
      return {
        status: 'error',
        error: this.createInvalidCardDataError(),
      };
    }

    try {
      const wallet = await this.getWalletModule();

      const cardData: IOSCardData = {
        network: params.cardNetwork.toLowerCase(),
        cardHolderName: params.cardholderName || 'Card Holder', // Fallback for staging environment
        lastDigits: params.lastFourDigits,
        cardDescription:
          params.cardDescription ||
          `MetaMask Card ending in ${params.lastFourDigits}`,
        ...(params.primaryAccountIdentifier
          ? { primaryAccountIdentifier: params.primaryAccountIdentifier }
          : {}),
      };

      // Validate required fields before calling native code
      if (
        !cardData.network ||
        !cardData.cardHolderName ||
        !cardData.lastDigits ||
        !cardData.cardDescription
      ) {
        return {
          status: 'error',
          error: this.createInvalidCardDataError(),
        };
      }

      // Call addCardToAppleWallet with the callback
      // The callback is invoked by PassKit with nonce, nonceSignature, and certificates
      // We must call the card provider to get the encrypted payload and return it
      const status = await wallet.addCardToAppleWallet(
        cardData,
        async (
          nonce: string,
          nonceSignature: string,
          certificates: string[],
        ): Promise<ApplePayEncryptedPayload> => {
          // Call the issuer encrypt callback to get encrypted data from card provider
          const encryptedPayload = await issuerEncryptCallback(
            nonce,
            nonceSignature,
            certificates,
          );

          return {
            encryptedPassData: encryptedPayload.encryptedPassData,
            activationData: encryptedPayload.activationData,
            ephemeralPublicKey: encryptedPayload.ephemeralPublicKey,
          };
        },
      );

      return {
        status: mapTokenizationStatus(status),
      };
    } catch (error) {
      logAdapterError('AppleWalletAdapter', 'provisionCard', error);
      return createErrorResult(
        error,
        ProvisioningErrorCode.UNKNOWN_ERROR,
        strings('card.push_provisioning.error_unknown'),
      );
    }
  }
}
