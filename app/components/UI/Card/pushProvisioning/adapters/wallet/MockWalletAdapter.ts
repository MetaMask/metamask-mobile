/**
 * Mock Wallet Provider Adapter
 *
 * A mock implementation of IWalletProviderAdapter for local development and testing.
 * Returns configurable mock data to simulate the push provisioning flow without
 * requiring real Google Wallet integration or package allowlisting.
 *
 * This adapter is useful when:
 * - Developing locally without Google's TapAndPay allowlist
 * - Testing the UI flow without native SDK dependencies
 * - Running unit/integration tests
 *
 * @example
 * ```typescript
 * import { MockWalletAdapter } from './pushProvisioning';
 *
 * // Create mock adapter with default config (always available)
 * const mockAdapter = new MockWalletAdapter();
 *
 * // Create mock adapter with custom config
 * const mockAdapter = new MockWalletAdapter({
 *   isAvailable: true,
 *   canAddCard: true,
 *   simulateDelay: 500,
 * });
 * ```
 */

import { PlatformOSType, Platform } from 'react-native';
import {
  WalletType,
  WalletData,
  WalletEligibility,
  CardTokenStatus,
  ProvisionCardParams,
  ProvisioningResult,
  CardActivationEvent,
} from '../../types';
import { IWalletProviderAdapter } from './IWalletProviderAdapter';
import Logger from '../../../../../../util/Logger';

/**
 * Mock wallet configuration options
 */
export interface MockWalletConfig {
  /** Whether the wallet should report as available */
  isAvailable: boolean;
  /** Whether cards can be added to the wallet */
  canAddCard: boolean;
  /** Mock card status for existing cards */
  existingCardStatus?: CardTokenStatus;
  /** Simulated network delay in milliseconds */
  simulateDelay?: number;
  /** Whether to simulate errors */
  simulateError?: boolean;
  /** Error message when simulating errors */
  errorMessage?: string;
  /** Mock device ID for wallet data */
  deviceId?: string;
  /** Mock wallet account ID */
  walletAccountId?: string;
  /** Enable debug logging */
  enableLogs?: boolean;
}

/**
 * Default mock configuration
 */
const DEFAULT_MOCK_CONFIG: MockWalletConfig = {
  isAvailable: true,
  canAddCard: true,
  existingCardStatus: 'not_found',
  simulateDelay: 300,
  simulateError: false,
  deviceId: 'mock-device-id-12345',
  walletAccountId: 'mock-wallet-account-67890',
  enableLogs: false,
};

/**
 * Mock Wallet Provider Adapter
 *
 * Use this adapter for local development and testing of the push provisioning
 * flow without needing real Google Wallet integration.
 */
export class MockWalletAdapter implements IWalletProviderAdapter {
  readonly walletType: WalletType = 'google_wallet';
  readonly platform: PlatformOSType = Platform.OS;

  private config: MockWalletConfig;
  private activationListeners: Set<(event: CardActivationEvent) => void>;

  constructor(config?: Partial<MockWalletConfig>) {
    this.config = { ...DEFAULT_MOCK_CONFIG, ...config };
    this.activationListeners = new Set();
    this.logDebug('MockWalletAdapter initialized', this.config);
  }

  /**
   * Update mock configuration at runtime
   */
  updateConfig(config: Partial<MockWalletConfig>): void {
    this.config = { ...this.config, ...config };
    this.logDebug('Config updated', this.config);
  }

  /**
   * Set whether to simulate availability
   */
  setAvailable(available: boolean): void {
    this.config.isAvailable = available;
  }

  /**
   * Set whether to simulate errors
   */
  setSimulateError(simulate: boolean, message?: string): void {
    this.config.simulateError = simulate;
    this.config.errorMessage = message;
  }

  /**
   * Simulate network delay
   */
  private async simulateDelay(): Promise<void> {
    if (this.config.simulateDelay && this.config.simulateDelay > 0) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.config.simulateDelay),
      );
    }
  }

  /**
   * Check if error simulation is enabled and throw if so
   */
  private checkForSimulatedError(operation: string): void {
    if (this.config.simulateError) {
      throw new Error(
        this.config.errorMessage ?? `Simulated error in ${operation}`,
      );
    }
  }

  /**
   * Check if the wallet is available on this device
   *
   * Mock implementation returns configurable availability.
   */
  async checkAvailability(): Promise<boolean> {
    this.logDebug('checkAvailability called');
    await this.simulateDelay();
    this.checkForSimulatedError('checkAvailability');

    this.logDebug('checkAvailability result', this.config.isAvailable);
    return this.config.isAvailable;
  }

  /**
   * Get detailed wallet eligibility information
   */
  async getEligibility(lastFourDigits?: string): Promise<WalletEligibility> {
    this.logDebug('getEligibility called', { lastFourDigits });
    await this.simulateDelay();
    this.checkForSimulatedError('getEligibility');

    const result: WalletEligibility = {
      isAvailable: this.config.isAvailable,
      canAddCard: this.config.canAddCard,
      existingCardStatus: lastFourDigits
        ? this.config.existingCardStatus
        : undefined,
      ineligibilityReason:
        !this.config.isAvailable || !this.config.canAddCard
          ? 'Mock wallet not available or cannot add card'
          : undefined,
    };

    this.logDebug('getEligibility result', result);
    return result;
  }

  /**
   * Check the status of a specific card in the wallet
   */
  async getCardStatus(lastFourDigits: string): Promise<CardTokenStatus> {
    this.logDebug('getCardStatus called', { lastFourDigits });
    await this.simulateDelay();
    this.checkForSimulatedError('getCardStatus');

    const status = this.config.existingCardStatus ?? 'not_found';
    this.logDebug('getCardStatus result', status);
    return status;
  }

  /**
   * Get the status of a card by its token identifier
   */
  async getCardStatusByIdentifier(
    tokenIdentifier: string,
    cardNetwork: string,
  ): Promise<CardTokenStatus> {
    this.logDebug('getCardStatusByIdentifier called', {
      tokenIdentifier,
      cardNetwork,
    });
    await this.simulateDelay();
    this.checkForSimulatedError('getCardStatusByIdentifier');

    const status = this.config.existingCardStatus ?? 'not_found';
    this.logDebug('getCardStatusByIdentifier result', status);
    return status;
  }

  /**
   * Get wallet-specific data for provisioning
   */
  async getWalletData(): Promise<WalletData> {
    this.logDebug('getWalletData called');
    await this.simulateDelay();
    this.checkForSimulatedError('getWalletData');

    const data: WalletData = {
      deviceId: this.config.deviceId,
      walletAccountId: this.config.walletAccountId,
    };

    this.logDebug('getWalletData result', data);
    return data;
  }

  /**
   * Provision a card to the wallet
   *
   * Mock implementation simulates success or configured error.
   */
  async provisionCard(
    params: ProvisionCardParams,
  ): Promise<ProvisioningResult> {
    this.logDebug('provisionCard called', {
      cardNetwork: params.cardNetwork,
      lastFourDigits: params.lastFourDigits,
      cardholderName: params.cardholderName,
    });

    await this.simulateDelay();

    if (this.config.simulateError) {
      this.logDebug('provisionCard simulating error');
      return {
        status: 'error',
        error: new Error(
          this.config.errorMessage ?? 'Simulated provisioning error',
        ) as never,
      };
    }

    const result: ProvisioningResult = {
      status: 'success',
      tokenId: `mock-token-${Date.now()}`,
      primaryAccountIdentifier: `mock-pai-${params.lastFourDigits}`,
    };

    this.logDebug('provisionCard result', result);
    return result;
  }

  /**
   * Resume provisioning for a card that requires activation
   */
  async resumeProvisioning(
    tokenReferenceId: string,
    cardNetwork: string,
    cardholderName?: string,
    lastFourDigits?: string,
  ): Promise<ProvisioningResult> {
    this.logDebug('resumeProvisioning called', {
      tokenReferenceId,
      cardNetwork,
      cardholderName,
      lastFourDigits,
    });

    await this.simulateDelay();

    if (this.config.simulateError) {
      this.logDebug('resumeProvisioning simulating error');
      return {
        status: 'error',
        error: new Error(
          this.config.errorMessage ?? 'Simulated resume error',
        ) as never,
      };
    }

    const result: ProvisioningResult = {
      status: 'success',
      tokenId: tokenReferenceId,
    };

    this.logDebug('resumeProvisioning result', result);
    return result;
  }

  /**
   * List all tokens in the wallet
   */
  async listTokens(): Promise<
    { identifier: string; lastDigits: string; tokenState: number }[]
  > {
    this.logDebug('listTokens called');
    await this.simulateDelay();
    this.checkForSimulatedError('listTokens');

    // Return empty array by default, or mock tokens if card exists
    if (this.config.existingCardStatus === 'active') {
      return [
        {
          identifier: 'mock-token-active',
          lastDigits: '4321',
          tokenState: 1, // Active
        },
      ];
    }

    return [];
  }

  /**
   * Add a listener for card activation events
   */
  addActivationListener(
    callback: (event: CardActivationEvent) => void,
  ): () => void {
    this.activationListeners.add(callback);
    this.logDebug('Activation listener added');

    return () => {
      this.activationListeners.delete(callback);
      this.logDebug('Activation listener removed');
    };
  }

  /**
   * Manually trigger an activation event (for testing)
   */
  triggerActivationEvent(event: CardActivationEvent): void {
    this.logDebug('Triggering activation event', event);
    this.activationListeners.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        this.logDebug('Error in activation listener', error);
      }
    });
  }

  /**
   * Log debug information
   */
  private logDebug(message: string, data?: unknown): void {
    if (this.config.enableLogs) {
      Logger.log(
        `[MockWalletAdapter] ${message}`,
        data ? JSON.stringify(data, null, 2) : '',
      );
    }
  }
}
