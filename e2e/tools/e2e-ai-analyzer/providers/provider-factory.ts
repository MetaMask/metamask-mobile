/**
 * LLM Provider Factory
 *
 * Factory for creating LLM provider instances with automatic fallback support.
 */

import { ILLMProvider } from './llm-provider';
import { ProviderType } from './types';
import { AnthropicProvider } from './anthropic-provider';
import { OpenAIProvider } from './openai-provider';
import { GoogleProvider } from './google-provider';
import { LLM_CONFIG } from '../config';

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
 * Error patterns that indicate a provider should be skipped for the session
 * These are "permanent" errors that won't resolve without user action
 */
const PERSISTENT_ERROR_PATTERNS = [
  /credit balance is too low/i,
  /exceeded your current quota/i,
  /insufficient.*(funds|credits|balance)/i,
  /billing/i,
  /payment required/i,
  /account.*suspended/i,
  /api key.*invalid/i,
  /authentication failed/i,
];

/**
 * Check if an error is persistent (won't resolve on retry)
 */
function isPersistentError(error: Error): boolean {
  const message = error.message;
  return PERSISTENT_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Create a provider with automatic fallback
 *
 * This function attempts to create and use the primary provider.
 * If the primary provider fails during message creation, it automatically
 * falls back to the next available provider.
 *
 * Providers that fail with persistent errors (billing, auth) are remembered
 * and skipped on subsequent calls within the same session.
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

  // Track providers that have failed with persistent errors
  const disabledProviders = new Set<string>();

  // Return a wrapper that tries providers in order
  const primaryProvider = availableProviders[0];

  return {
    providerId: primaryProvider.providerId,
    displayName: `${primaryProvider.displayName} (with fallback)`,

    async createMessage(request) {
      let lastError: Error | null = null;

      for (const provider of availableProviders) {
        // Skip providers that have failed with persistent errors
        if (disabledProviders.has(provider.providerId)) {
          continue;
        }

        try {
          console.log(`Trying provider: ${provider.displayName}`);
          // Override model with the current provider's default model
          const providerRequest = {
            ...request,
            model: provider.getDefaultModel(),
          };
          return await provider.createMessage(providerRequest);
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          console.warn(`Provider ${provider.displayName} failed:`, err.message);
          lastError = err;

          // If this is a persistent error, disable this provider for the session
          if (isPersistentError(err)) {
            console.log(
              `⚠️  Disabling ${provider.displayName} for this session (persistent error)`,
            );
            disabledProviders.add(provider.providerId);
          }
        }
      }

      throw lastError || new Error('All providers failed');
    },

    async isAvailable() {
      return availableProviders.length > disabledProviders.size;
    },

    getDefaultModel() {
      return primaryProvider.getDefaultModel();
    },
  };
}
