import type { Hex, CaipChainId } from '@metamask/utils';

/**
 * Token interface for Perps trading.
 * Independent from BridgeToken to avoid Mobile-only dependencies.
 * Shape matches BridgeToken for backward compatibility.
 */
export type PerpsToken = {
  address: string;
  name?: string;
  symbol: string;
  image?: string;
  decimals: number;
  chainId: Hex | CaipChainId;
  balance?: string;
  balanceFiat?: string;
  tokenFiatAmount?: number;
  currencyExchangeRate?: number;
  noFee?: { isSource: boolean; isDestination: boolean };
  aggregators?: string[];
  metadata?: Record<string, unknown>;
};
