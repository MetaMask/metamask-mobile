import type { PerpsProviderType } from '../../controllers/types';
import type { ProviderDisplayInfo } from './PerpsProviderSelector.types';

/**
 * Provider display configuration
 */
export const PROVIDER_DISPLAY_INFO: Record<
  PerpsProviderType,
  ProviderDisplayInfo
> = {
  hyperliquid: {
    id: 'hyperliquid',
    name: 'HyperLiquid',
    description: 'High-performance L1 perps',
  },
  myx: {
    id: 'myx',
    name: 'MYX',
    description: 'BNB Chain perps (Beta)',
  },
};
