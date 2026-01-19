/**
 * Card Provider Registry
 *
 * Manages registration and retrieval of card provider adapters.
 * Uses the registry pattern to allow runtime registration of adapters.
 */

import {
  CardProviderId,
  ProvisioningError,
  ProvisioningErrorCode,
} from '../../types';
import { DEFAULT_CARD_PROVIDER } from '../../constants';
import { ICardProviderAdapter } from './ICardProviderAdapter';

/**
 * Registry for managing card provider adapters.
 *
 * This singleton class maintains a map of card provider adapters
 * and provides methods to register, retrieve, and manage them.
 *
 * Usage:
 * ```typescript
 * // Register an adapter
 * CardProviderRegistry.getInstance().register('galileo', new GalileoCardAdapter(config));
 *
 * // Get an adapter
 * const adapter = CardProviderRegistry.getInstance().getAdapter('galileo');
 * ```
 */
export class CardProviderRegistry {
  private static instance: CardProviderRegistry;
  private adapters: Map<CardProviderId, ICardProviderAdapter>;
  private defaultProviderId: CardProviderId;

  private constructor() {
    this.adapters = new Map();
    this.defaultProviderId = DEFAULT_CARD_PROVIDER;
  }

  /**
   * Get the singleton instance of the registry
   */
  static getInstance(): CardProviderRegistry {
    if (!CardProviderRegistry.instance) {
      CardProviderRegistry.instance = new CardProviderRegistry();
    }
    return CardProviderRegistry.instance;
  }

  /**
   * Register a card provider adapter
   *
   * @param providerId - The unique identifier for the provider
   * @param adapter - The adapter instance to register
   * @throws Error if an adapter with the same ID is already registered
   */
  register(providerId: CardProviderId, adapter: ICardProviderAdapter): void {
    if (this.adapters.has(providerId)) {
      throw new Error(
        `Card provider adapter '${providerId}' is already registered`,
      );
    }
    this.adapters.set(providerId, adapter);
  }

  /**
   * Register or replace a card provider adapter
   *
   * Unlike register(), this will replace an existing adapter if one exists.
   *
   * @param providerId - The unique identifier for the provider
   * @param adapter - The adapter instance to register
   */
  registerOrReplace(
    providerId: CardProviderId,
    adapter: ICardProviderAdapter,
  ): void {
    this.adapters.set(providerId, adapter);
  }

  /**
   * Unregister a card provider adapter
   *
   * @param providerId - The provider ID to unregister
   * @returns true if the adapter was removed, false if it wasn't registered
   */
  unregister(providerId: CardProviderId): boolean {
    return this.adapters.delete(providerId);
  }

  /**
   * Get a card provider adapter by ID
   *
   * @param providerId - The provider ID to retrieve
   * @returns The adapter instance
   * @throws ProvisioningError if the adapter is not found
   */
  getAdapter(providerId: CardProviderId): ICardProviderAdapter {
    const adapter = this.adapters.get(providerId);
    if (!adapter) {
      throw new ProvisioningError(
        ProvisioningErrorCode.CARD_PROVIDER_NOT_FOUND,
        `Card provider adapter '${providerId}' is not registered`,
      );
    }
    return adapter;
  }

  /**
   * Get a card provider adapter, returning undefined if not found
   *
   * @param providerId - The provider ID to retrieve
   * @returns The adapter instance or undefined
   */
  getAdapterOrUndefined(
    providerId: CardProviderId,
  ): ICardProviderAdapter | undefined {
    return this.adapters.get(providerId);
  }

  /**
   * Get the default card provider adapter
   *
   * @returns The default adapter instance
   * @throws ProvisioningError if the default adapter is not registered
   */
  getDefaultAdapter(): ICardProviderAdapter {
    return this.getAdapter(this.defaultProviderId);
  }

  /**
   * Set the default card provider
   *
   * @param providerId - The provider ID to set as default
   * @throws Error if the provider is not registered
   */
  setDefaultProvider(providerId: CardProviderId): void {
    if (!this.adapters.has(providerId)) {
      throw new Error(
        `Cannot set default: Card provider '${providerId}' is not registered`,
      );
    }
    this.defaultProviderId = providerId;
  }

  /**
   * Get the default provider ID
   */
  getDefaultProviderId(): CardProviderId {
    return this.defaultProviderId;
  }

  /**
   * Check if a provider is registered
   *
   * @param providerId - The provider ID to check
   * @returns true if the provider is registered
   */
  hasProvider(providerId: CardProviderId): boolean {
    return this.adapters.has(providerId);
  }

  /**
   * Get all registered provider IDs
   *
   * @returns Array of registered provider IDs
   */
  getRegisteredProviders(): CardProviderId[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Find an adapter that supports a specific card
   *
   * @param cardId - The card ID to check support for
   * @returns The first adapter that supports the card, or undefined
   */
  async findAdapterForCard(
    cardId: string,
  ): Promise<ICardProviderAdapter | undefined> {
    for (const adapter of this.adapters.values()) {
      try {
        const supports = await adapter.supportsCard(cardId);
        if (supports) {
          return adapter;
        }
      } catch {
        // Continue checking other adapters
      }
    }
    return undefined;
  }

  /**
   * Clear all registered adapters
   *
   * Primarily used for testing purposes.
   */
  clear(): void {
    this.adapters.clear();
    this.defaultProviderId = DEFAULT_CARD_PROVIDER;
  }

  /**
   * Reset the singleton instance
   *
   * Primarily used for testing purposes.
   */
  static resetInstance(): void {
    CardProviderRegistry.instance = new CardProviderRegistry();
  }
}
