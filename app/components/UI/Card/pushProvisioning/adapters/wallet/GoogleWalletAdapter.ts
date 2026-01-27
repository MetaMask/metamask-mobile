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
  WalletData,
  WalletEligibility,
  CardTokenStatus,
  ProvisionCardParams,
  ProvisioningResult,
  CardActivationEvent,
  ProvisioningError,
  ProvisioningErrorCode,
  UserAddress,
} from '../../types';
import { IWalletProviderAdapter } from './IWalletProviderAdapter';
import Logger from '../../../../../../util/Logger';
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

interface AndroidWalletData {
  deviceID: string;
  walletAccountID: string;
}

interface TokenInfo {
  identifier: string;
  lastDigits: string;
  tokenState: number;
}

type TokenizationStatus = 'success' | 'canceled' | 'error';
type RNWalletCardStatus =
  | 'not found'
  | 'active'
  | 'pending'
  | 'suspended'
  | 'deactivated'
  | 'requireActivation';

/**
 * Map react-native-wallet card status to our CardTokenStatus type
 */
function mapCardStatus(status: RNWalletCardStatus): CardTokenStatus {
  switch (status) {
    case 'not found':
      return 'not_found';
    case 'active':
      return 'active';
    case 'pending':
      return 'pending';
    case 'suspended':
      return 'suspended';
    case 'deactivated':
      return 'deactivated';
    case 'requireActivation':
      return 'requires_activation';
    default:
      return 'not_found';
  }
}

/**
 * Map tokenization status to our ProvisioningResult status
 */
function mapTokenizationStatus(
  status: TokenizationStatus,
): ProvisioningResult['status'] {
  switch (status) {
    case 'success':
      return 'success';
    case 'canceled':
      return 'canceled';
    case 'error':
      return 'error';
    default:
      return 'error';
  }
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
 * 2. Get secure wallet info (deviceId, walletAccountId)
 * 3. Get opaque payment card from card provider
 * 4. Call pushTokenize with the opaque payment card
 * 5. Google/network creates and provisions the token
 */
export class GoogleWalletAdapter implements IWalletProviderAdapter {
  readonly walletType: WalletType = 'google_wallet';
  readonly platform: PlatformOSType = 'android';

  private activationListeners: Set<(event: CardActivationEvent) => void>;
  private walletModule: typeof import('@expensify/react-native-wallet') | null =
    null;
  private listenerSubscription?: { remove: () => void };
  private cachedWalletData?: WalletData;

  private moduleLoadPromise: Promise<void> | null = null;
  private moduleLoadError: Error | null = null;

  constructor() {
    this.activationListeners = new Set();
    // Start loading the module immediately but don't block
    this.moduleLoadPromise = this.initializeWalletModule();
  }

  /**
   * Initialize the wallet module lazily
   */
  private async initializeWalletModule(): Promise<void> {
    if (Platform.OS !== 'android') {
      return;
    }

    try {
      this.walletModule = await import('@expensify/react-native-wallet');
      this.moduleLoadError = null;
    } catch (error) {
      this.moduleLoadError =
        error instanceof Error ? error : new Error(String(error));
      Logger.log(
        'GoogleWalletAdapter: Failed to load wallet module',
        this.moduleLoadError.message,
      );
    }
  }

  /**
   * Get the wallet module, ensuring it's loaded
   */
  private async getWalletModule(): Promise<
    typeof import('@expensify/react-native-wallet')
  > {
    // Wait for the initial load to complete
    if (this.moduleLoadPromise) {
      await this.moduleLoadPromise;
    }

    // If still not loaded, try again
    if (!this.walletModule && !this.moduleLoadError) {
      await this.initializeWalletModule();
    }

    if (!this.walletModule) {
      const errorMessage = this.moduleLoadError
        ? `Failed to load wallet module: ${this.moduleLoadError.message}`
        : strings('card.push_provisioning.error_wallet_not_available');

      Logger.log('GoogleWalletAdapter.getWalletModule: Module not available', {
        hasModule: !!this.walletModule,
        loadError: this.moduleLoadError?.message,
        platform: Platform.OS,
      });

      throw new ProvisioningError(
        ProvisioningErrorCode.WALLET_NOT_AVAILABLE,
        errorMessage,
        this.moduleLoadError ?? undefined,
      );
    }

    return this.walletModule;
  }

  /**
   * Check if Google Wallet is available on this device
   */
  async checkAvailability(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      Logger.log(
        'GoogleWalletAdapter: Not available - platform is not Android',
      );
      return false;
    }

    try {
      const wallet = await this.getWalletModule();
      const isAvailable = await wallet.checkWalletAvailability();

      if (!isAvailable) {
        Logger.log('GoogleWalletAdapter: Not available');
      }

      return isAvailable;
    } catch (error) {
      Logger.log('GoogleWalletAdapter: Not available - Error:', {
        message: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Get detailed wallet eligibility information
   */
  async getEligibility(lastFourDigits?: string): Promise<WalletEligibility> {
    const isAvailable = await this.checkAvailability();

    if (!isAvailable) {
      return {
        isAvailable: false,
        canAddCard: false,
        ineligibilityReason: strings(
          'card.push_provisioning.error_wallet_not_available',
        ),
      };
    }

    let existingCardStatus: CardTokenStatus | undefined;

    if (lastFourDigits) {
      existingCardStatus = await this.getCardStatus(lastFourDigits);
    }

    const canAddCard =
      !existingCardStatus ||
      existingCardStatus === 'not_found' ||
      existingCardStatus === 'requires_activation';

    return {
      isAvailable: true,
      canAddCard,
      existingCardStatus,
      ineligibilityReason:
        existingCardStatus === 'active'
          ? strings('card.push_provisioning.error_card_already_in_wallet')
          : undefined,
    };
  }

  /**
   * Check the status of a specific card in Google Wallet
   */
  async getCardStatus(lastFourDigits: string): Promise<CardTokenStatus> {
    try {
      const wallet = await this.getWalletModule();
      const status = await wallet.getCardStatusBySuffix(lastFourDigits);
      return mapCardStatus(status as RNWalletCardStatus);
    } catch (error) {
      Logger.log('GoogleWalletAdapter.getCardStatus error', error);
      return 'not_found';
    }
  }

  /**
   * Get the status of a card by its token reference ID
   */
  async getCardStatusByIdentifier(
    tokenIdentifier: string,
    cardNetwork: string,
  ): Promise<CardTokenStatus> {
    try {
      const wallet = await this.getWalletModule();
      const status = await wallet.getCardStatusByIdentifier(
        tokenIdentifier,
        cardNetwork,
      );
      return mapCardStatus(status as RNWalletCardStatus);
    } catch (error) {
      Logger.log('GoogleWalletAdapter.getCardStatusByIdentifier error', error);
      return 'not_found';
    }
  }

  /**
   * Get wallet-specific data for provisioning
   *
   * For Google Wallet, this returns:
   * - deviceId: The stable hardware ID
   * - walletAccountId: The active wallet ID
   */
  async getWalletData(): Promise<WalletData> {
    if (this.cachedWalletData) {
      return this.cachedWalletData;
    }

    try {
      const wallet = await this.getWalletModule();
      const walletInfo =
        (await wallet.getSecureWalletInfo()) as AndroidWalletData;

      this.cachedWalletData = {
        deviceId: walletInfo.deviceID,
        walletAccountId: walletInfo.walletAccountID,
      };

      return this.cachedWalletData;
    } catch (error) {
      Logger.log('GoogleWalletAdapter.getWalletData error', error);
      throw new ProvisioningError(
        ProvisioningErrorCode.WALLET_NOT_INITIALIZED,
        strings('card.push_provisioning.error_wallet_not_initialized'),
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Provision a card to Google Wallet
   *
   * This calls the Tap and Pay SDK's pushTokenize method with
   * the pre-encrypted opaque payment card data.
   */
  async provisionCard(
    params: ProvisionCardParams,
  ): Promise<ProvisioningResult> {
    if (Platform.OS !== 'android') {
      return {
        status: 'error',
        error: new ProvisioningError(
          ProvisioningErrorCode.PLATFORM_NOT_SUPPORTED,
          strings('card.push_provisioning.error_platform_not_supported'),
        ),
      };
    }

    if (!params.encryptedPayload.opaquePaymentCard) {
      return {
        status: 'error',
        error: new ProvisioningError(
          ProvisioningErrorCode.INVALID_CARD_DATA,
          strings('card.push_provisioning.error_invalid_card_data'),
        ),
      };
    }

    try {
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

      const cardData: AndroidCardData = {
        network: params.cardNetwork,
        opaquePaymentCard: params.encryptedPayload.opaquePaymentCard,
        cardHolderName: params.cardholderName,
        lastDigits: params.lastFourDigits,
        userAddress: toAndroidUserAddress(userAddress),
      };

      const status = await wallet.addCardToGoogleWallet(cardData);

      return {
        status: mapTokenizationStatus(status as TokenizationStatus),
      };
    } catch (error) {
      Logger.log('GoogleWalletAdapter.provisionCard error', error);
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
   * Resume provisioning for a card that requires activation
   *
   * On Android, if a card was previously added but requires additional
   * verification (Yellow Path), this method resumes the provisioning flow.
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
        error: new ProvisioningError(
          ProvisioningErrorCode.PLATFORM_NOT_SUPPORTED,
          strings('card.push_provisioning.error_platform_not_supported'),
        ),
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
        status: mapTokenizationStatus(status as TokenizationStatus),
      };
    } catch (error) {
      Logger.log('GoogleWalletAdapter.resumeProvisioning error', error);
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
   * List all tokens in Google Wallet
   */
  async listTokens(): Promise<TokenInfo[]> {
    try {
      const wallet = await this.getWalletModule();
      const tokens = await wallet.listTokens();
      return tokens as TokenInfo[];
    } catch (error) {
      Logger.log('GoogleWalletAdapter.listTokens error', error);
      return [];
    }
  }

  /**
   * Add a listener for card activation events
   */
  addActivationListener(
    callback: (event: CardActivationEvent) => void,
  ): () => void {
    this.activationListeners.add(callback);

    // Set up the native listener if not already done
    if (!this.listenerSubscription && this.walletModule) {
      this.listenerSubscription = this.walletModule.addListener(
        'onCardActivated',
        (data: { actionStatus: string; tokenId?: string }) => {
          const event: CardActivationEvent = {
            tokenId: data.tokenId,
            status:
              data.actionStatus === 'active'
                ? 'activated'
                : data.actionStatus === 'canceled'
                  ? 'canceled'
                  : 'failed',
          };
          this.notifyActivationListeners(event);
        },
      );
    }

    // Return unsubscribe function
    return () => {
      this.activationListeners.delete(callback);

      // Remove native listener if no more listeners
      if (this.activationListeners.size === 0 && this.listenerSubscription) {
        this.listenerSubscription.remove();
        this.listenerSubscription = undefined;
      }
    };
  }

  /**
   * Notify all activation listeners
   */
  private notifyActivationListeners(event: CardActivationEvent): void {
    this.activationListeners.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        Logger.log('GoogleWalletAdapter: Error in activation listener', error);
      }
    });
  }

  /**
   * Clear cached wallet data
   *
   * Useful for testing or when wallet state changes
   */
  clearCachedWalletData(): void {
    this.cachedWalletData = undefined;
  }
}
