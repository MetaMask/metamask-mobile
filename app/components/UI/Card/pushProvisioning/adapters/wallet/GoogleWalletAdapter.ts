/**
 * Google Wallet Provider Adapter
 *
 * Implementation of IWalletProviderAdapter for Google Wallet on Android.
 * Wraps the react-native-wallet library's Android-specific methods.
 *
 * Currently only Mastercard is supported.
 */

import { Platform, PlatformOSType } from 'react-native';
import {
  WalletType,
  WalletEligibility,
  CardTokenStatus,
  ProvisionCardParams,
  ProvisioningResult,
  CardActivationEvent,
  ProvisioningErrorCode,
  UserAddress,
} from '../../types';
import { IWalletProviderAdapter } from './IWalletProviderAdapter';
import { BaseWalletAdapter } from './BaseWalletAdapter';
import {
  mapTokenizationStatus,
  validateTokenArray,
  createErrorResult,
  logAdapterError,
  TokenInfo,
  TokenizationStatus,
} from './utils';
import { strings } from '../../../../../../../locales/i18n';

// Types from react-native-wallet for Android
interface AndroidCardData {
  network: string;
  opaquePaymentCard: string;
  cardHolderName: string;
  lastDigits: string;
  userAddress: {
    name: string;
    addressOne: string;
    addressTwo?: string;
    administrativeArea: string;
    locality: string;
    countryCode: string;
    postalCode: string;
    phoneNumber: string;
  };
}

interface AndroidResumeCardData {
  network: string;
  tokenReferenceID: string;
  cardHolderName?: string;
  lastDigits?: string;
}

/**
 * Convert our UserAddress to Android format
 */
function toAndroidUserAddress(
  address: UserAddress,
): AndroidCardData['userAddress'] {
  return {
    name: address.name,
    addressOne: address.addressOne,
    addressTwo: address.addressTwo,
    administrativeArea: address.administrativeArea,
    locality: address.locality,
    countryCode: address.countryCode,
    postalCode: address.postalCode,
    phoneNumber: address.phoneNumber,
  };
}

/**
 * Google Wallet Provider Adapter
 *
 * This adapter handles card provisioning to Google Wallet on Android devices.
 * It uses the react-native-wallet library to interact with the Tap and Pay SDK.
 *
 * Google Wallet Provisioning Flow:
 * 1. Check if Google Wallet is available on the device
 * 3. Get opaque payment card from card provider
 * 4. Call pushTokenize with the opaque payment card
 * 5. Google/network creates and provisions the token
 */
export class GoogleWalletAdapter
  extends BaseWalletAdapter
  implements IWalletProviderAdapter
{
  readonly walletType: WalletType = 'google_wallet';
  readonly platform: PlatformOSType = 'android';

  constructor() {
    super();
    // Start loading the module immediately but don't block
    this.moduleLoadPromise = this.initializeWalletModule();
  }

  protected getAdapterName(): string {
    return 'GoogleWalletAdapter';
  }

  protected getExpectedPlatform(): PlatformOSType {
    return 'android';
  }

  /**
   * Handle activation event from native module
   *
   * Android SDK sends events with 'status' property (not 'actionStatus').
   * Possible values: 'active' (success), 'canceled' (user canceled).
   * Note: The SDK never sends a 'failed' status - errors are handled
   * via the function return value, not the activation event.
   */
  protected handleNativeActivationEvent(data: unknown): void {
    const typedData = data as { status?: string; tokenId?: string };
    const event: CardActivationEvent = {
      tokenId: typedData.tokenId,
      status:
        typedData.status === 'active'
          ? 'activated'
          : typedData.status === 'canceled'
            ? 'canceled'
            : 'failed', // Defensive fallback for unknown statuses
    };
    this.notifyActivationListeners(event);
  }

  /**
   * Override determineActionForStatus to support Yellow Path (resume)
   */
  protected determineActionForStatus(status?: CardTokenStatus): {
    canAddCard: boolean;
    recommendedAction: WalletEligibility['recommendedAction'];
    ineligibilityReason?: string;
  } {
    // Google Wallet supports resume flow for requires_activation
    if (status === 'requires_activation') {
      return {
        canAddCard: true,
        recommendedAction: 'resume',
      };
    }

    // Use base class implementation for other statuses
    return super.determineActionForStatus(status);
  }

  /**
   * Get additional eligibility info for Google Wallet (token reference ID for resume)
   */
  protected async getAdditionalEligibilityInfo(
    lastFourDigits?: string,
    existingCardStatus?: CardTokenStatus,
  ): Promise<Partial<WalletEligibility>> {
    // If card requires activation, find its token ID for resume flow
    if (existingCardStatus === 'requires_activation' && lastFourDigits) {
      const token = await this.findTokenByLastDigits(lastFourDigits);
      if (token) {
        return { tokenReferenceId: token.identifier };
      }
    }
    return {};
  }

  /**
   * Provision a card to Google Wallet
   *
   * This method automatically handles the Yellow Path (requires activation) case:
   * 1. Checks if the card requires activation
   * 2. If so, automatically resumes provisioning
   * 3. Otherwise, adds the card normally
   *
   * This makes the resume flow transparent to the user.
   */
  async provisionCard(
    params: ProvisionCardParams,
  ): Promise<ProvisioningResult> {
    if (Platform.OS !== 'android') {
      return {
        status: 'error',
        error: this.createPlatformNotSupportedError(),
      };
    }

    if (!params.encryptedPayload.opaquePaymentCard) {
      return {
        status: 'error',
        error: this.createInvalidCardDataError(),
      };
    }

    try {
      // Check if card requires activation (Yellow Path)
      const cardStatus = await this.getCardStatus(params.lastFourDigits);

      if (cardStatus === 'requires_activation') {
        // Find existing token for resume
        const existingToken = await this.findTokenByLastDigits(
          params.lastFourDigits,
        );

        if (existingToken) {
          // Resume the provisioning automatically
          return this.resumeProvisioning(
            existingToken.identifier,
            params.cardNetwork,
            params.cardholderName,
            params.lastFourDigits,
          );
        }
        // Token not found - fall through to add new card
      }

      // Normal flow - add new card
      return this.addNewCard(params);
    } catch (error) {
      logAdapterError('GoogleWalletAdapter', 'provisionCard', error);
      return createErrorResult(
        error,
        ProvisioningErrorCode.UNKNOWN_ERROR,
        strings('card.push_provisioning.error_unknown'),
      );
    }
  }

  /**
   * Add a new card to Google Wallet
   *
   * Internal method that handles the actual card addition via the Tap and Pay SDK.
   */
  private async addNewCard(
    params: ProvisionCardParams,
  ): Promise<ProvisioningResult> {
    const wallet = await this.getWalletModule();

    // Build user address with defaults if not provided
    const userAddress = params.userAddress ?? {
      name: params.cardholderName,
      addressOne: '',
      administrativeArea: '',
      locality: '',
      countryCode: 'US',
      postalCode: '',
      phoneNumber: '',
    };

    // opaquePaymentCard is validated in provisionCard() before calling this method
    const cardData: AndroidCardData = {
      network: params.cardNetwork,
      opaquePaymentCard: params.encryptedPayload.opaquePaymentCard as string,
      cardHolderName: params.cardholderName,
      lastDigits: params.lastFourDigits,
      userAddress: toAndroidUserAddress(userAddress),
    };

    const status = await wallet.addCardToGoogleWallet(cardData);

    return {
      status: mapTokenizationStatus(status as TokenizationStatus),
    };
  }

  /**
   * Resume provisioning for a card that requires activation (Yellow Path)
   *
   * On Android, if a card was previously added but requires additional
   * verification, this method resumes the provisioning flow.
   */
  async resumeProvisioning(
    tokenReferenceId: string,
    cardNetwork: string,
    cardholderName?: string,
    lastFourDigits?: string,
  ): Promise<ProvisioningResult> {
    if (Platform.OS !== 'android') {
      return {
        status: 'error',
        error: this.createPlatformNotSupportedError(),
      };
    }

    try {
      const wallet = await this.getWalletModule();

      const resumeData: AndroidResumeCardData = {
        network: cardNetwork,
        tokenReferenceID: tokenReferenceId,
        cardHolderName: cardholderName,
        lastDigits: lastFourDigits,
      };

      const status = await wallet.resumeAddCardToGoogleWallet(resumeData);

      return {
        status: mapTokenizationStatus(status),
      };
    } catch (error) {
      logAdapterError('GoogleWalletAdapter', 'resumeProvisioning', error);
      return createErrorResult(
        error,
        ProvisioningErrorCode.UNKNOWN_ERROR,
        strings('card.push_provisioning.error_unknown'),
      );
    }
  }

  /**
   * List all tokens in Google Wallet
   *
   * Returns information about all tokenized cards.
   * Useful for finding token IDs for the resume flow.
   */
  async listTokens(): Promise<TokenInfo[]> {
    try {
      const wallet = await this.getWalletModule();
      const tokens = await wallet.listTokens();
      return validateTokenArray(tokens);
    } catch (error) {
      logAdapterError('GoogleWalletAdapter', 'listTokens', error);
      return [];
    }
  }

  /**
   * Find token ID for a card by its last four digits
   *
   * Helper method to find the token reference ID for resume flow.
   */
  async findTokenByLastDigits(
    lastFourDigits: string,
  ): Promise<TokenInfo | null> {
    const tokens = await this.listTokens();
    return tokens.find((t) => t.lastDigits === lastFourDigits) ?? null;
  }
}
