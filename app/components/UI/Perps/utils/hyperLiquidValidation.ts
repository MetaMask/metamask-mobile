import { isValidHexAddress, type CaipAssetId, type Hex } from '@metamask/utils';
import {
  HYPERLIQUID_ASSET_CONFIGS,
  getSupportedAssets,
} from '../constants/hyperLiquidConfig';
import type { GetSupportedPathsParams } from '../controllers/types';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';

/**
 * Validation utilities for HyperLiquid operations
 */

/**
 * Create standardized error response
 */
export function createErrorResult<
  T extends { success: boolean; error?: string },
>(error: unknown, defaultResponse: T): T {
  return {
    ...defaultResponse,
    success: false,
    error: error instanceof Error ? error.message : 'Unknown error',
  };
}

/**
 * Validate withdrawal parameters
 */
export function validateWithdrawalParams(params: {
  assetId?: CaipAssetId;
  amount?: string;
  destination?: Hex;
}): { isValid: boolean; error?: string } {
  // Validate required parameters
  if (!params.assetId) {
    return { isValid: false, error: 'assetId is required for withdrawals' };
  }

  // Validate amount
  if (!params.amount || parseFloat(params.amount) <= 0) {
    return { isValid: false, error: 'Amount must be a positive number' };
  }

  // Validate destination address if provided
  if (params.destination && !isValidHexAddress(params.destination)) {
    return {
      isValid: false,
      error: `Invalid destination address format: ${params.destination}`,
    };
  }

  return { isValid: true };
}

/**
 * Validate asset support for withdrawals using AssetRoute arrays
 */
export function validateAssetSupport(
  assetId: CaipAssetId,
  supportedRoutes: { assetId: CaipAssetId }[],
): { isValid: boolean; error?: string } {
  const supportedAssetIds = supportedRoutes.map((route) => route.assetId);

  if (!supportedAssetIds.includes(assetId)) {
    const supportedAssets = supportedAssetIds
      .map((path) => {
        // Extract symbol from CAIP asset ID
        const parts = path.split('/');
        return parts[parts.length - 2] || 'Unknown';
      })
      .join(', ');

    return {
      isValid: false,
      error: `Asset ${assetId} is not supported for withdrawals. Supported assets: ${supportedAssets}`,
    };
  }

  return { isValid: true };
}

/**
 * Validate balance against withdrawal amount
 */
export function validateBalance(
  withdrawAmount: number,
  availableBalance: number,
): { isValid: boolean; error?: string } {
  if (withdrawAmount > availableBalance) {
    return {
      isValid: false,
      error: `Insufficient balance. Available: ${availableBalance}, Requested: ${withdrawAmount}`,
    };
  }

  return { isValid: true };
}

/**
 * Apply filters to asset paths with comprehensive logging
 */
export function applyPathFilters(
  assets: CaipAssetId[],
  params?: GetSupportedPathsParams,
): CaipAssetId[] {
  if (!params) {
    DevLogger.log(
      'HyperLiquid: applyPathFilters - no params, returning all assets',
      { assets },
    );
    return assets;
  }

  let filtered = assets;

  DevLogger.log('HyperLiquid: applyPathFilters - starting filter', {
    initialAssets: assets,
    filterParams: params,
  });

  if (params.chainId) {
    const before = filtered;
    filtered = filtered.filter((asset) =>
      asset.startsWith(params.chainId as string),
    );
    DevLogger.log('HyperLiquid: applyPathFilters - chainId filter', {
      chainId: params.chainId,
      before,
      after: filtered,
    });
  }

  if (params.symbol && params.symbol in HYPERLIQUID_ASSET_CONFIGS) {
    const config =
      HYPERLIQUID_ASSET_CONFIGS[
        params.symbol as keyof typeof HYPERLIQUID_ASSET_CONFIGS
      ];
    const isTestnet = params.isTestnet ?? false;
    const selectedAsset = isTestnet ? config.testnet : config.mainnet;
    const before = filtered;
    filtered = [selectedAsset];
    DevLogger.log('HyperLiquid: applyPathFilters - symbol filter', {
      symbol: params.symbol,
      isTestnet,
      config,
      selectedAsset,
      before,
      after: filtered,
    });
  }

  if (params.assetId) {
    const before = filtered;
    // Use case-insensitive comparison for asset ID matching to handle address case differences
    filtered = filtered.filter(
      (asset) => asset.toLowerCase() === params.assetId?.toLowerCase(),
    );
    DevLogger.log('HyperLiquid: applyPathFilters - assetId filter', {
      assetId: params.assetId,
      before,
      after: filtered,
      exactMatch: before.includes(params.assetId),
      caseInsensitiveMatch: before.some(
        (asset) => asset.toLowerCase() === params.assetId?.toLowerCase(),
      ),
    });
  }

  DevLogger.log('HyperLiquid: applyPathFilters - final result', {
    initialAssets: assets,
    finalFiltered: filtered,
    filterParams: params,
  });

  return filtered;
}

/**
 * Get supported deposit/withdrawal paths with filtering
 */
export function getSupportedPaths(
  params?: GetSupportedPathsParams,
): CaipAssetId[] {
  const isTestnet = params?.isTestnet ?? false;
  const assets = getSupportedAssets(isTestnet);
  const filteredAssets = applyPathFilters(assets, params);

  DevLogger.log('HyperLiquid: getSupportedPaths', {
    isTestnet,
    requestedParams: params,
    allAssets: assets,
    filteredAssets,
    returnType: 'CaipAssetId[]',
    example: filteredAssets[0],
  });

  return filteredAssets;
}

/**
 * Validate order parameters
 */
export function validateOrderParams(params: {
  coin?: string;
  size?: string;
  price?: string;
}): { isValid: boolean; error?: string } {
  if (!params.coin) {
    return { isValid: false, error: 'Coin is required for orders' };
  }

  if (!params.size || parseFloat(params.size) <= 0) {
    return { isValid: false, error: 'Size must be a positive number' };
  }

  if (params.price && parseFloat(params.price) <= 0) {
    return {
      isValid: false,
      error: 'Price must be a positive number if provided',
    };
  }

  return { isValid: true };
}

/**
 * Validate coin exists in asset mapping
 */
export function validateCoinExists(
  coin: string,
  coinToAssetId: Map<string, number>,
): { isValid: boolean; error?: string } {
  if (!coinToAssetId.has(coin)) {
    return { isValid: false, error: `Unknown coin: ${coin}` };
  }

  return { isValid: true };
}
