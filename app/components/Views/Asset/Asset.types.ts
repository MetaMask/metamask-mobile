/**
 * Asset view navigation parameters
 */

import { TokenRwaData } from '@metamask/assets-controllers';

/** Asset loader parameters */
export interface AssetLoaderParams {
  address?: string;
  chainId?: string;
}

/** Asset view parameters */
export interface AssetViewParams {
  address?: string;
  chainId?: string;
  symbol?: string;
  name?: string;
  decimals?: number;
  image?: string;
  pricePercentChange1d?: number;
  isFromTrending?: boolean;
  balance?: string;
  balanceFiat?: string;
  isNative?: boolean;
  isETH?: boolean;
  aggregators?: string[];
  source?: string;
  scrollToMerklRewards?: boolean;
  rwaData?: TokenRwaData;
}
