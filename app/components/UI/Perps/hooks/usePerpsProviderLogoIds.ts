import { useMemo } from 'react';
import type { PerpsActiveProviderMode } from '@metamask/perps-controller';

import { PROVIDER_CONFIG } from '../constants/perpsConfig';
import { usePerpsProvider } from './usePerpsProvider';

/** Exchange whose mark can be drawn. Aggregated mode resolves to both. */
export type PerpsProviderLogoId =
  | typeof PROVIDER_CONFIG.DefaultProvider
  | typeof PROVIDER_CONFIG.LighterProvider;

const NO_PROVIDER_LOGOS: readonly PerpsProviderLogoId[] = [];

/**
 * Hyperliquid then Lighter, matching the stacked pair on Perps Home.
 * The later mark paints on top.
 */
const AGGREGATED_PROVIDER_LOGO_IDS: readonly PerpsProviderLogoId[] = [
  PROVIDER_CONFIG.DefaultProvider,
  PROVIDER_CONFIG.LighterProvider,
];

/**
 * Marks for the active provider. Aggregated mode draws both exchanges.
 * Returns an empty list for an unknown provider.
 */
export function getPerpsProviderLogoIds(
  activeProvider: PerpsActiveProviderMode | undefined,
): readonly PerpsProviderLogoId[] {
  switch (activeProvider) {
    case PROVIDER_CONFIG.DefaultProvider:
      return [PROVIDER_CONFIG.DefaultProvider];
    case PROVIDER_CONFIG.LighterProvider:
      return [PROVIDER_CONFIG.LighterProvider];
    case PROVIDER_CONFIG.AggregatedProvider:
      return AGGREGATED_PROVIDER_LOGO_IDS;
    default:
      return NO_PROVIDER_LOGOS;
  }
}

/**
 * Logo ids for the available-balance row. Empty when the Lighter flag is off,
 * so callers render nothing and keep the single-provider layout.
 */
export function usePerpsProviderLogoIds(): readonly PerpsProviderLogoId[] {
  const { activeProvider, isMultiProviderEnabled } = usePerpsProvider();

  return useMemo(() => {
    if (!isMultiProviderEnabled) {
      return NO_PROVIDER_LOGOS;
    }

    return getPerpsProviderLogoIds(activeProvider);
  }, [activeProvider, isMultiProviderEnabled]);
}
