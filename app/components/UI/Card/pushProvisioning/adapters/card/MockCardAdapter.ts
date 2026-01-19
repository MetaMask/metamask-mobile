/**
 * Mock Card Provider Adapter
 *
 * A mock implementation of ICardProviderAdapter for local testing.
 * Returns dummy data to simulate the push provisioning flow without
 * requiring real API calls or card provider integration.
 *
 * Based on the react-native-wallet example patterns.
 *
 * @example
 * ```typescript
 * import { CardProviderRegistry, MockCardAdapter } from './pushProvisioning';
 *
 * // Register mock adapter for testing
 * CardProviderRegistry.getInstance().register('mock', new MockCardAdapter());
 * ```
 */

import {
  CardProviderId,
  CardDisplayInfo,
  ProvisioningRequest,
  ProvisioningResponse,
  CardNetwork,
} from '../../types';
import { ICardProviderAdapter } from './ICardProviderAdapter';
import Logger from '../../../../../../util/Logger';

/**
 * Mock card data configuration
 */
export interface MockCardConfig {
  cardId: string;
  cardholderName: string;
  lastFourDigits: string;
  cardNetwork: CardNetwork;
  cardDescription?: string;
  expiryDate?: string;
  opaquePaymentCard: string;
  simulateDelay?: number;
  simulateError?: boolean;
  errorMessage?: string;
}

/**
 * Default mock card data
 */
const DEFAULT_MOCK_CARD: MockCardConfig = {
  cardId: 'mock-card-123',
  cardholderName: 'Test User',
  lastFourDigits: '4321',
  cardNetwork: 'MASTERCARD',
  cardDescription: 'MetaMask Card ending in 4321',
  expiryDate: '12/28',
  // This is a dummy opaque payment card - in real use, this would be encrypted card data
  opaquePaymentCard: 'bW9ja19vcGFxdWVfcGF5bWVudF9jYXJkX2RhdGFfMTIzNDU2Nzg5MA==',
  simulateDelay: 500,
  simulateError: false,
};

/**
 * Mock Card Provider Adapter
 *
 * Use this adapter for local development and testing of the push provisioning
 * flow without needing real card provider integration.
 */
export class MockCardAdapter implements ICardProviderAdapter {
  readonly providerId: CardProviderId = 'mock';

  private config: MockCardConfig;
  private enableLogs: boolean;

  constructor(config?: Partial<MockCardConfig>, enableLogs = true) {
    this.config = { ...DEFAULT_MOCK_CARD, ...config };
    this.enableLogs = enableLogs;
  }

  /**
   * Update mock configuration at runtime
   */
  updateConfig(config: Partial<MockCardConfig>): void {
    this.config = { ...this.config, ...config };
    this.logDebug('Config updated', this.config);
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
   * Check if this adapter supports the given card
   *
   * Mock implementation always returns true for the configured card ID,
   * or any card ID if using wildcard matching.
   */
  async supportsCard(cardId: string): Promise<boolean> {
    await this.simulateDelay();
    this.logDebug('supportsCard', { cardId });

    // Support any card ID or match specific mock card ID
    return cardId === this.config.cardId || this.config.cardId === '*';
  }

  /**
   * Check if the card is eligible for provisioning
   */
  async checkEligibility(
    cardId: string,
  ): Promise<{ eligible: boolean; reason?: string }> {
    await this.simulateDelay();
    this.logDebug('checkEligibility', { cardId });

    this.checkForSimulatedError('checkEligibility');

    // Mock always returns eligible
    return { eligible: true };
  }

  /**
   * Get pre-encrypted opaque payment card data for Google Wallet
   *
   * Returns mock encrypted payload data.
   */
  async getOpaquePaymentCard(
    request: ProvisioningRequest,
  ): Promise<ProvisioningResponse> {
    await this.simulateDelay();
    this.logDebug('getOpaquePaymentCard', {
      cardId: request.cardId,
      deviceId: request.walletData.deviceId,
      walletAccountId: request.walletData.walletAccountId,
    });

    this.checkForSimulatedError('getOpaquePaymentCard');

    return {
      success: true,
      encryptedPayload: {
        opaquePaymentCard: this.config.opaquePaymentCard,
      },
      cardNetwork: this.config.cardNetwork,
      lastFourDigits: this.config.lastFourDigits,
      cardholderName: this.config.cardholderName,
      cardDescription: this.config.cardDescription,
    };
  }

  /**
   * Get card details for display purposes
   */
  async getCardDetails(cardId: string): Promise<CardDisplayInfo> {
    await this.simulateDelay();
    this.logDebug('getCardDetails', { cardId });

    this.checkForSimulatedError('getCardDetails');

    return {
      cardId: this.config.cardId,
      cardholderName: this.config.cardholderName,
      lastFourDigits: this.config.lastFourDigits,
      cardNetwork: this.config.cardNetwork,
      cardDescription: this.config.cardDescription,
      expiryDate: this.config.expiryDate,
    };
  }

  /**
   * Log debug information
   */
  private logDebug(method: string, data: unknown): void {
    if (this.enableLogs) {
      Logger.log(`MockCardAdapter.${method}`, JSON.stringify(data, null, 2));
    }
  }
}
