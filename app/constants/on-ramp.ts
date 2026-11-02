import { NETWORKS_CHAIN_ID } from './network';

export enum FIAT_ORDER_PROVIDERS {
  WYRE = 'WYRE',
  WYRE_APPLE_PAY = 'WYRE_APPLE_PAY',
  TRANSAK = 'TRANSAK',
  MOONPAY = 'MOONPAY',
  // The key for fiat on-ramp aggregator
  AGGREGATOR = 'AGGREGATOR',
  DEPOSIT = 'DEPOSIT',
  // The key for V2 unified ramps orders
  RAMPS_V2 = 'RAMPS_V2',
}

export enum FIAT_ORDER_STATES {
  PENDING = 'PENDING',
  FAILED = 'FAILED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  CREATED = 'CREATED',
}

export const FORMATTED_NETWORK_NAMES = {
  [NETWORKS_CHAIN_ID.MAINNET]: 'Ethereum Mainnet',
  [NETWORKS_CHAIN_ID.BSC]: 'Binance Smart Chain',
  [NETWORKS_CHAIN_ID.POLYGON]: 'Polygon',
  [NETWORKS_CHAIN_ID.AVAXCCHAIN]: 'Avalanche',
  [NETWORKS_CHAIN_ID.CELO]: 'Celo',
  [NETWORKS_CHAIN_ID.FANTOM]: 'Fantom',
} as const;

export const NATIVE_ADDRESS = '0x0000000000000000000000000000000000000000';

// On-ramp API `statusReason` for orders whose provider was removed. Final on
// the client, whatever `status` or `canBeUpdated` say.
export const PROVIDER_REMOVED_STATUS_REASON = 'PROVIDER_REMOVED';
