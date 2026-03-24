/**
 * Asset view navigation parameters
 */

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
}
