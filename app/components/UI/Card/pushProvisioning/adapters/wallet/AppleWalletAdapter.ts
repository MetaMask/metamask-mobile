/**
 * Apple Wallet Provider Adapter
 *
 * Implementation of IWalletProviderAdapter for Apple Wallet on iOS.
 * Wraps the react-native-wallet library's iOS-specific methods.
 *
 * Currently only Mastercard is supported.
 */

import { Platform, PlatformOSType } from 'react-native';
import {
  WalletType,
  ProvisionCardParams,
  ProvisioningResult,
  CardActivationEvent,
  ProvisioningErrorCode,
} from '../../types';
import { IWalletProviderAdapter } from './IWalletProviderAdapter';
import { BaseWalletAdapter } from './BaseWalletAdapter';
import {
  mapTokenizationStatus,
  createErrorResult,
  logAdapterError,
} from './utils';
import { strings } from '../../../../../../../locales/i18n';

// Types from react-native-wallet for iOS
interface IOSCardData {
  network: string;
  cardHolderName: string;
  lastDigits: string;
  cardDescription: string;
}

interface IOSEncryptPayload {
  encryptedPassData: string;
  activationData: string;
  ephemeralPublicKey: string;
}

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
   * Handle activation event from native module
   *
   * iOS SDK sends events with 'state' property (the TS types incorrectly say 'actionStatus').
   * Possible values: 'activated' (success), 'canceled' (error or user cancel).
   * Note: The SDK never sends a 'failed' status - errors result in 'canceled'.
   */
  protected handleNativeActivationEvent(data: unknown): void {
    const typedData = data as {
      serialNumber?: string;
      state?: string;
    };
    const event: CardActivationEvent = {
      serialNumber: typedData.serialNumber,
      status:
        typedData.state === 'activated'
          ? 'activated'
          : typedData.state === 'canceled'
            ? 'canceled'
            : 'failed', // Defensive fallback for unknown statuses
    };
    this.notifyActivationListeners(event);
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
        ): Promise<IOSEncryptPayload> => {
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
