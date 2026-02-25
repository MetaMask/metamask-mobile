import type { PerpsProviderType } from '@metamask/perps-controller';
import type {
  ProviderDisplayInfo,
  ProviderNetworkOption,
} from './PerpsProviderSelector.types';

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

/**
 * Combined provider + network options for the unified selector
 */
export const PROVIDER_NETWORK_OPTIONS: ProviderNetworkOption[] = [
  {
    id: 'hyperliquid-mainnet',
    providerId: 'hyperliquid',
    isTestnet: false,
    name: 'HyperLiquid',
    network: 'Mainnet',
    description: 'High-performance L1 perps',
  },
  {
    id: 'hyperliquid-testnet',
    providerId: 'hyperliquid',
    isTestnet: true,
    name: 'HyperLiquid',
    network: 'Testnet',
    description: 'High-performance L1 perps',
  },
  {
    id: 'myx-mainnet',
    providerId: 'myx',
    isTestnet: false,
    name: 'MYX',
    network: 'Mainnet',
    description: 'BNB Chain perps (Beta)',
  },
  {
    id: 'myx-testnet',
    providerId: 'myx',
    isTestnet: true,
    name: 'MYX',
    network: 'Testnet',
    description: 'Arbitrum Sepolia perps (Beta)',
  },
];
