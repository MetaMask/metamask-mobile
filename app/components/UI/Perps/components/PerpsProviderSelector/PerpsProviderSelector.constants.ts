import type { PerpsActiveProviderMode } from '@metamask/perps-controller';
import type {
  ProviderDisplayInfo,
  ProviderNetworkOption,
} from './PerpsProviderSelector.types';

/**
 * Provider display configuration
 */
export const PROVIDER_DISPLAY_INFO: Record<
  PerpsActiveProviderMode,
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
  lighter: {
    id: 'lighter',
    name: 'Lighter',
    description: 'ZK-rollup perps (POC)',
  },
  aggregated: {
    id: 'aggregated',
    name: 'All Providers',
    description: 'Aggregated multi-provider view',
  },
};

/**
 * Combined provider + network options for the unified selector
 */
export const PROVIDER_NETWORK_OPTIONS: ProviderNetworkOption[] = [
  {
    id: 'aggregated-mainnet',
    providerId: 'aggregated',
    isTestnet: false,
    name: 'All Providers',
    network: 'Mainnet',
    description: 'Aggregated multi-provider view',
  },
  {
    id: 'aggregated-testnet',
    providerId: 'aggregated',
    isTestnet: true,
    name: 'All Providers',
    network: 'Testnet',
    description: 'Aggregated multi-provider view',
  },
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
    id: 'lighter-mainnet',
    providerId: 'lighter',
    isTestnet: false,
    name: 'Lighter',
    network: 'Mainnet',
    description: 'zkLighter perps',
  },
  {
    id: 'lighter-testnet',
    providerId: 'lighter',
    isTestnet: true,
    name: 'Lighter',
    network: 'Testnet',
    description: 'zkLighter perps (POC)',
  },
];
