/**
 * LLM Provider Factory
 *
 * Factory for creating LLM provider instances with automatic fallback support.
 */

import { ILLMProvider } from './llm-provider.ts';
import { ProviderType } from './types.ts';
import { AnthropicProvider } from './anthropic-provider.ts';
import { OpenAIProvider } from './openai-provider.ts';
import { GoogleProvider } from './google-provider.ts';
import { LLM_CONFIG } from '../config.ts';

/**
 * Provider constructor registry
 */
const PROVIDER_CONSTRUCTORS: Record<ProviderType, () => ILLMProvider> = {
  anthropic: () => new AnthropicProvider(),
  openai: () => new OpenAIProvider(),
  google: () => new GoogleProvider(),
};

/**
 * Create a provider instance by type
 *
 * @param type - The provider type to create
 * @returns The provider instance
 * @throws Error if provider type is unknown
 */
export function createProvider(type: ProviderType): ILLMProvider {
  const constructor = PROVIDER_CONSTRUCTORS[type];
  if (!constructor) {
    throw new Error(`Unknown provider type: ${type}`);
  }
  return constructor();
}

/**
 * Get list of all supported provider types
 *
 * @returns Array of provider types
 */
export function getSupportedProviders(): ProviderType[] {
  return Object.keys(PROVIDER_CONSTRUCTORS) as ProviderType[];
}

/**
 * Get list of providers that have API keys configured
 *
 * @returns Array of provider types with available credentials
 */
export async function getAvailableProviders(): Promise<ProviderType[]> {
  const available: ProviderType[] = [];

  for (const type of getSupportedProviders()) {
    const provider = createProvider(type);
    if (await provider.isAvailable()) {
      available.push(type);
    }
  }

  return available;
}

/**
 * Get the first available provider from the priority list
 *
 * Tries providers in the given order (or default priority from config)
 * and returns the first one that is available.
 *
 * @param preferredOrder - Optional custom priority order
 * @returns The first available provider, or null if none available
 */
export async function getFirstAvailableProvider(
  preferredOrder?: ProviderType[],
): Promise<ILLMProvider | null> {
  const order = preferredOrder || LLM_CONFIG.providerPriority;

  for (const type of order) {
    try {
      const provider = createProvider(type);
      if (await provider.isAvailable()) {
        return provider;
      }
    } catch (error) {
      // Provider creation failed, try next
      console.warn(`Failed to create ${type} provider:`, error);
    }
  }

  return null;
}

/**
 * Create a provider with automatic fallback
 *
 * This function attempts to create and use the primary provider.
 * If the primary provider fails during message creation, it automatically
 * falls back to the next available provider.
 *
 * Note: Provider availability is verified upfront via isAvailable() which
 * makes actual API calls to validate credentials before analysis begins.
 *
 * @param preferredOrder - Optional custom priority order
 * @returns A wrapped provider that handles fallback automatically
 */
export async function createProviderWithFallback(
  preferredOrder?: ProviderType[],
): Promise<ILLMProvider> {
  const order = preferredOrder || LLM_CONFIG.providerPriority;
  const availableProviders: ILLMProvider[] = [];

  // Collect all available providers
  for (const type of order) {
    try {
      const provider = createProvider(type);
      if (await provider.isAvailable()) {
        availableProviders.push(provider);
      }
    } catch {
      // Skip unavailable providers
    }
  }

  if (availableProviders.length === 0) {
    throw new Error(
      'No LLM provider available. Set one of: ' +
        `${LLM_CONFIG.providers.anthropic.envKey}, ` +
        `${LLM_CONFIG.providers.openai.envKey}, ` +
        `${LLM_CONFIG.providers.google.envKey}`,
    );
  }

  // Return a wrapper that tries providers in order
  const primaryProvider = availableProviders[0];

  return {
    providerId: primaryProvider.providerId,
    displayName: `${primaryProvider.displayName} (with fallback)`,

    async createMessage(request) {
      let lastError: Error | null = null;

      for (const provider of availableProviders) {
        try {
          console.log(`Trying provider: ${provider.displayName}`);
          const providerRequest = {
            ...request,
            model: provider.getDefaultModel(),
          };
          return await provider.createMessage(providerRequest);
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          console.warn(`Provider ${provider.displayName} failed:`, err.message);
          lastError = err;
        }
      }

      throw lastError || new Error('All providers failed');
    },

    async isAvailable() {
      return availableProviders.length > 0;
    },

    getDefaultModel() {
      return primaryProvider.getDefaultModel();
    },
  };
}
