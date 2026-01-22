import { useSelector } from 'react-redux';
import { useCallback, useMemo } from 'react';
import Engine from '../../../../core/Engine';
import { selectPerpsActiveProvider } from '../selectors/perpsController';
import type {
  PerpsProviderType,
  PerpsProviderInfo,
  SwitchProviderResult,
} from '../controllers/types';

export interface UsePerpsProviderResult {
  /** Currently active provider ID */
  activeProvider: PerpsProviderType;
  /** List of available providers with their info */
  availableProviders: PerpsProviderInfo[];
  /** Switch to a different provider */
  setActiveProvider: (
    providerId: PerpsProviderType,
  ) => Promise<SwitchProviderResult>;
  /** Current provider info (convenience getter) */
  currentProviderInfo: PerpsProviderInfo | undefined;
  /** Whether there are multiple providers available (for showing selector) */
  hasMultipleProviders: boolean;
}

/**
 * Hook to access provider selection state and actions
 *
 * Provides access to:
 * - Current active provider
 * - List of available providers
 * - Method to switch providers
 *
 * @example
 * ```tsx
 * const { activeProvider, availableProviders, setActiveProvider } = usePerpsProvider();
 *
 * // Switch provider
 * await setActiveProvider('myx');
 * ```
 */
export function usePerpsProvider(): UsePerpsProviderResult {
  const activeProvider = useSelector(selectPerpsActiveProvider);

  const availableProviders = useMemo(() => {
    try {
      return Engine.context.PerpsController.getAvailableProviders();
    } catch {
      // Controller not initialized yet, return default
      return [];
    }
  }, []);

  const setActiveProvider = useCallback(
    async (providerId: PerpsProviderType): Promise<SwitchProviderResult> => {
      try {
        return await Engine.context.PerpsController.setActiveProvider(
          providerId,
        );
      } catch (error) {
        return {
          success: false,
          providerId: activeProvider,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to switch provider',
        };
      }
    },
    [activeProvider],
  );

  const currentProviderInfo = useMemo(
    () => availableProviders.find((p) => p.id === activeProvider),
    [availableProviders, activeProvider],
  );

  const hasMultipleProviders = availableProviders.length > 1;

  return {
    activeProvider,
    availableProviders,
    setActiveProvider,
    currentProviderInfo,
    hasMultipleProviders,
  };
}
