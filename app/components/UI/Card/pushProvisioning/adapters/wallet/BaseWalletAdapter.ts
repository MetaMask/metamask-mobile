/**
 * Base Wallet Provider Adapter
 *
 * Abstract base class providing common functionality for wallet adapters:
 * module loading, activation listeners, and eligibility determination.
 */

import { Platform, PlatformOSType } from 'react-native';
import {
  WalletType,
  WalletEligibility,
  CardTokenStatus,
  CardActivationEvent,
  ProvisioningError,
  ProvisioningErrorCode,
} from '../../types';
import { mapCardStatus, logAdapterError } from './utils';
import Logger from '../../../../../../util/Logger';
import { strings } from '../../../../../../../locales/i18n';
import { getWalletName } from '../../constants';

export abstract class BaseWalletAdapter {
  abstract readonly walletType: WalletType;
  abstract readonly platform: PlatformOSType;

  protected activationListeners: Set<(event: CardActivationEvent) => void>;
  protected walletModule:
    | typeof import('@expensify/react-native-wallet')
    | null = null;
  protected listenerSubscription?: { remove: () => void };
  protected moduleLoadPromise: Promise<void> | null = null;
  protected moduleLoadError: Error | null = null;

  constructor() {
    this.activationListeners = new Set();
  }

  protected abstract getAdapterName(): string;
  protected abstract getExpectedPlatform(): PlatformOSType;
  protected abstract handleNativeActivationEvent(data: unknown): void;

  protected async initializeWalletModule(): Promise<void> {
    if (Platform.OS !== this.getExpectedPlatform()) {
      return;
    }

    try {
      this.walletModule = await import('@expensify/react-native-wallet');
      this.moduleLoadError = null;
    } catch (error) {
      this.moduleLoadError =
        error instanceof Error ? error : new Error(String(error));
      Logger.log(
        `${this.getAdapterName()}: Failed to load wallet module`,
        this.moduleLoadError.message,
      );
    }
  }

  protected async getWalletModule(): Promise<
    typeof import('@expensify/react-native-wallet')
  > {
    if (this.moduleLoadPromise) {
      await this.moduleLoadPromise;
    }

    if (!this.walletModule && !this.moduleLoadError) {
      this.moduleLoadPromise = this.initializeWalletModule();
      await this.moduleLoadPromise;
    }

    if (!this.walletModule) {
      const errorMessage = this.moduleLoadError
        ? `Failed to load wallet module: ${this.moduleLoadError.message}`
        : strings('card.push_provisioning.error_wallet_not_available', {
            walletName: getWalletName(),
          });

      Logger.log(
        `${this.getAdapterName()}.getWalletModule: Module not available`,
        {
          hasModule: !!this.walletModule,
          loadError: this.moduleLoadError?.message,
          platform: Platform.OS,
        },
      );

      throw new ProvisioningError(
        ProvisioningErrorCode.WALLET_NOT_AVAILABLE,
        errorMessage,
        this.moduleLoadError ?? undefined,
      );
    }

    return this.walletModule;
  }

  async checkAvailability(): Promise<boolean> {
    if (Platform.OS !== this.getExpectedPlatform()) {
      Logger.log(
        `${this.getAdapterName()}: Not available - platform is not ${this.getExpectedPlatform()}`,
      );
      return false;
    }

    try {
      const wallet = await this.getWalletModule();
      const isAvailable = await wallet.checkWalletAvailability();

      if (!isAvailable) {
        Logger.log(`${this.getAdapterName()}: Not available`);
      }

      return isAvailable;
    } catch (error) {
      Logger.log(`${this.getAdapterName()}: Not available - Error:`, {
        message: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  async getCardStatus(lastFourDigits: string): Promise<CardTokenStatus> {
    try {
      const wallet = await this.getWalletModule();
      const status = await wallet.getCardStatusBySuffix(lastFourDigits);
      return mapCardStatus(status);
    } catch (error) {
      logAdapterError(this.getAdapterName(), 'getCardStatus', error);
      return 'not_found';
    }
  }

  async getEligibility(lastFourDigits?: string): Promise<WalletEligibility> {
    const isAvailable = await this.checkAvailability();

    if (!isAvailable) {
      return {
        isAvailable: false,
        canAddCard: false,
        ineligibilityReason: strings(
          'card.push_provisioning.error_wallet_not_available',
          { walletName: getWalletName() },
        ),
        recommendedAction: 'none',
      };
    }

    let existingCardStatus: CardTokenStatus | undefined;

    if (lastFourDigits) {
      existingCardStatus = await this.getCardStatus(lastFourDigits);
    }

    const additionalInfo = await this.getAdditionalEligibilityInfo(
      lastFourDigits,
      existingCardStatus,
    );

    const { canAddCard, recommendedAction, ineligibilityReason } =
      this.determineActionForStatus(existingCardStatus);

    return {
      isAvailable: true,
      canAddCard,
      existingCardStatus,
      ineligibilityReason,
      recommendedAction,
      ...additionalInfo,
    };
  }

  /** Override in subclasses to provide extra eligibility data (e.g., tokenReferenceId) */
  protected async getAdditionalEligibilityInfo(
    _lastFourDigits?: string,
    _existingCardStatus?: CardTokenStatus,
  ): Promise<Partial<WalletEligibility>> {
    return {};
  }

  /** Determine recommended action based on card status. Override for platform-specific behavior. */
  protected determineActionForStatus(status?: CardTokenStatus): {
    canAddCard: boolean;
    recommendedAction: WalletEligibility['recommendedAction'];
    ineligibilityReason?: string;
  } {
    switch (status) {
      case undefined:
      case 'not_found':
        return {
          canAddCard: true,
          recommendedAction: 'add_card',
        };

      case 'requires_activation':
        return {
          canAddCard: true,
          recommendedAction: 'add_card',
        };

      case 'active':
        return {
          canAddCard: false,
          recommendedAction: 'none',
          ineligibilityReason: strings(
            'card.push_provisioning.error_card_already_in_wallet',
            { walletName: getWalletName() },
          ),
        };

      case 'pending':
        return {
          canAddCard: false,
          recommendedAction: 'wait',
          ineligibilityReason: strings(
            'card.push_provisioning.error_card_pending',
            { walletName: getWalletName() },
          ),
        };

      case 'suspended':
      case 'deactivated':
        return {
          canAddCard: false,
          recommendedAction: 'contact_support',
          ineligibilityReason: strings(
            'card.push_provisioning.error_card_suspended',
            { walletName: getWalletName() },
          ),
        };

      default:
        return {
          canAddCard: false,
          recommendedAction: 'none',
        };
    }
  }

  addActivationListener(
    callback: (event: CardActivationEvent) => void,
  ): () => void {
    this.activationListeners.add(callback);
    this.setupNativeListenerIfNeeded();

    return () => {
      this.activationListeners.delete(callback);

      if (this.activationListeners.size === 0 && this.listenerSubscription) {
        this.listenerSubscription.remove();
        this.listenerSubscription = undefined;
      }
    };
  }

  protected async setupNativeListenerIfNeeded(): Promise<void> {
    if (this.listenerSubscription) {
      return;
    }

    if (this.activationListeners.size === 0) {
      return;
    }

    try {
      const wallet = await this.getWalletModule();

      if (this.listenerSubscription || this.activationListeners.size === 0) {
        return;
      }

      this.listenerSubscription = wallet.addListener(
        'onCardActivated',
        (data: unknown) => {
          Logger.log(`${this.getAdapterName()}: onCardActivated`, data);
          this.handleNativeActivationEvent(data);
        },
      );
    } catch (error) {
      Logger.log(`${this.getAdapterName()}: Failed to set up native listener`, {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  protected notifyActivationListeners(event: CardActivationEvent): void {
    this.activationListeners.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        Logger.log(`${this.getAdapterName()}: Error in activation listener`, {
          message: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }

  protected createPlatformNotSupportedError(): ProvisioningError {
    return new ProvisioningError(
      ProvisioningErrorCode.PLATFORM_NOT_SUPPORTED,
      strings('card.push_provisioning.error_platform_not_supported'),
    );
  }

  protected createInvalidCardDataError(): ProvisioningError {
    return new ProvisioningError(
      ProvisioningErrorCode.INVALID_CARD_DATA,
      strings('card.push_provisioning.error_invalid_card_data'),
    );
  }
}
