/**
 * LLM Provider Interface
 *
 * Defines the contract that all LLM provider implementations must follow.
 * This enables the analyzer to work with multiple providers interchangeably.
 */

import { ProviderType, LLMRequest, LLMResponse } from './types';

/**
 * Interface for LLM provider implementations
 */
export interface ILLMProvider {
  /**
   * Unique identifier for this provider
   */
  readonly providerId: ProviderType;

  /**
   * Human-readable name for logging
   */
  readonly displayName: string;

  /**
   * Create a message/completion with the LLM
   *
   * @param request - The request parameters
   * @returns The LLM response with content blocks
   */
  createMessage(request: LLMRequest): Promise<LLMResponse>;

  /**
   * Check if this provider is available (has valid API key configured)
   *
   * @returns true if the provider can be used
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get the default model for this provider
   *
   * @returns The default model identifier
   */
  getDefaultModel(): string;
}
