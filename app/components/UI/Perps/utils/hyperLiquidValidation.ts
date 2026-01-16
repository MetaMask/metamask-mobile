import { isValidHexAddress, type CaipAssetId, type Hex } from '@metamask/utils';
import {
  HYPERLIQUID_ASSET_CONFIGS,
  getSupportedAssets,
  TRADING_DEFAULTS,
} from '../constants/hyperLiquidConfig';
import type { GetSupportedPathsParams } from '../controllers/types';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { HYPERLIQUID_ORDER_LIMITS } from '../constants/perpsConfig';
import { PERPS_ERROR_CODES } from '../controllers/perpsErrorCodes';

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
    error:
      error instanceof Error ? error.message : PERPS_ERROR_CODES.UNKNOWN_ERROR,
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
  DevLogger.log('validateWithdrawalParams: Starting validation', {
    params,
    hasAssetId: !!params.assetId,
    hasAmount: !!params.amount,
    hasDestination: !!params.destination,
  });

  // Validate required parameters
  if (!params.assetId) {
    DevLogger.log('validateWithdrawalParams: Missing assetId', {
      error: PERPS_ERROR_CODES.WITHDRAW_ASSET_ID_REQUIRED,
      params,
    });
    return {
      isValid: false,
      error: PERPS_ERROR_CODES.WITHDRAW_ASSET_ID_REQUIRED,
    };
  }

  // Validate amount
  if (!params.amount) {
    DevLogger.log('validateWithdrawalParams: Missing amount', {
      error: PERPS_ERROR_CODES.WITHDRAW_AMOUNT_REQUIRED,
      params,
    });
    return {
      isValid: false,
      error: PERPS_ERROR_CODES.WITHDRAW_AMOUNT_REQUIRED,
    };
  }

  const amount = parseFloat(params.amount);
  if (isNaN(amount) || amount <= 0) {
    DevLogger.log('validateWithdrawalParams: Invalid amount', {
      error: PERPS_ERROR_CODES.WITHDRAW_AMOUNT_POSITIVE,
      amount: params.amount,
      parsedAmount: amount,
      isNaN: isNaN(amount),
    });
    return {
      isValid: false,
      error: PERPS_ERROR_CODES.WITHDRAW_AMOUNT_POSITIVE,
    };
  }

  // Validate destination address if provided
  if (params.destination && !isValidHexAddress(params.destination)) {
    DevLogger.log('validateWithdrawalParams: Invalid destination address', {
      error: PERPS_ERROR_CODES.WITHDRAW_INVALID_DESTINATION,
      destination: params.destination,
      isValidHex: isValidHexAddress(params.destination),
    });
    return {
      isValid: false,
      error: PERPS_ERROR_CODES.WITHDRAW_INVALID_DESTINATION,
    };
  }

  DevLogger.log('validateWithdrawalParams: All validations passed', {
    assetId: params.assetId,
    amount: params.amount,
    destination: params.destination || 'will use user wallet',
  });

  return { isValid: true };
}

/**
 * Validate deposit parameters
 */
export function validateDepositParams(params: {
  assetId?: CaipAssetId;
  amount?: string;
  isTestnet?: boolean;
}): { isValid: boolean; error?: string } {
  DevLogger.log('validateDepositParams: Starting validation', {
    params,
    hasAssetId: !!params.assetId,
    hasAmount: !!params.amount,
    isTestnet: params.isTestnet,
  });

  // Validate required parameters
  if (!params.assetId) {
    DevLogger.log('validateDepositParams: Missing assetId', {
      error: PERPS_ERROR_CODES.DEPOSIT_ASSET_ID_REQUIRED,
      params,
    });
    return {
      isValid: false,
      error: PERPS_ERROR_CODES.DEPOSIT_ASSET_ID_REQUIRED,
    };
  }

  // Validate amount
  if (!params.amount) {
    DevLogger.log('validateDepositParams: Missing amount', {
      error: PERPS_ERROR_CODES.DEPOSIT_AMOUNT_REQUIRED,
      params,
    });
    return {
      isValid: false,
      error: PERPS_ERROR_CODES.DEPOSIT_AMOUNT_REQUIRED,
    };
  }

  const amount = parseFloat(params.amount);
  if (isNaN(amount) || amount <= 0) {
    DevLogger.log('validateDepositParams: Invalid amount', {
      error: PERPS_ERROR_CODES.DEPOSIT_AMOUNT_POSITIVE,
      amount: params.amount,
      parsedAmount: amount,
      isNaN: isNaN(amount),
    });
    return {
      isValid: false,
      error: PERPS_ERROR_CODES.DEPOSIT_AMOUNT_POSITIVE,
    };
  }

  // Check minimum deposit amount
  const minimumAmount = params.isTestnet
    ? TRADING_DEFAULTS.amount.testnet
    : TRADING_DEFAULTS.amount.mainnet;

  DevLogger.log('validateDepositParams: Checking minimum amount', {
    amount,
    minimumAmount,
    isTestnet: params.isTestnet,
    network: params.isTestnet ? 'testnet' : 'mainnet',
  });

  if (amount < minimumAmount) {
    DevLogger.log('validateDepositParams: Below minimum deposit', {
      error: PERPS_ERROR_CODES.DEPOSIT_MINIMUM_AMOUNT,
      amount,
      minimumAmount,
      difference: minimumAmount - amount,
    });
    return {
      isValid: false,
      error: PERPS_ERROR_CODES.DEPOSIT_MINIMUM_AMOUNT,
    };
  }

  DevLogger.log('validateDepositParams: All validations passed', {
    assetId: params.assetId,
    amount: params.amount,
    parsedAmount: amount,
    minimumAmount,
    isTestnet: params.isTestnet,
  });

  return { isValid: true };
}

/**
 * Validate asset support for withdrawals using AssetRoute arrays
 */
export function validateAssetSupport(
  assetId: CaipAssetId,
  supportedRoutes: { assetId: CaipAssetId }[],
): { isValid: boolean; error?: string } {
  DevLogger.log('validateAssetSupport: Checking asset support', {
    assetId,
    supportedRoutesCount: supportedRoutes.length,
  });

  const supportedAssetIds = supportedRoutes.map((route) => route.assetId);

  // Check if asset is supported
  const isSupported = supportedAssetIds.includes(assetId);

  if (!isSupported) {
    // Also check case-insensitive match for contract addresses
    const isSupportedCaseInsensitive = supportedAssetIds.some(
      (supportedId) => supportedId.toLowerCase() === assetId.toLowerCase(),
    );

    if (!isSupportedCaseInsensitive) {
      DevLogger.log('validateAssetSupport: Asset not supported', {
        error: PERPS_ERROR_CODES.WITHDRAW_ASSET_NOT_SUPPORTED,
        assetId,
        supportedAssetIds,
        checkedCaseInsensitive: true,
      });

      return {
        isValid: false,
        error: PERPS_ERROR_CODES.WITHDRAW_ASSET_NOT_SUPPORTED,
      };
    }

    DevLogger.log(
      '⚠️ validateAssetSupport: Asset supported with case mismatch',
      {
        providedAssetId: assetId,
        matchedAssetId: supportedAssetIds.find(
          (id) => id.toLowerCase() === assetId.toLowerCase(),
        ),
      },
    );
  }

  DevLogger.log('validateAssetSupport: Asset is supported', {
    assetId,
  });

  return { isValid: true };
}

/**
 * Validate balance against withdrawal amount
 */
export function validateBalance(
  withdrawAmount: number,
  availableBalance: number,
): { isValid: boolean; error?: string } {
  DevLogger.log('validateBalance: Checking balance sufficiency', {
    withdrawAmount,
    availableBalance,
    difference: availableBalance - withdrawAmount,
  });

  if (withdrawAmount > availableBalance) {
    const shortfall = withdrawAmount - availableBalance;

    DevLogger.log('validateBalance: Insufficient balance', {
      error: PERPS_ERROR_CODES.WITHDRAW_INSUFFICIENT_BALANCE,
      withdrawAmount,
      availableBalance,
      shortfall,
      percentageOfAvailable:
        ((withdrawAmount / availableBalance) * 100).toFixed(2) + '%',
    });

    return {
      isValid: false,
      error: PERPS_ERROR_CODES.WITHDRAW_INSUFFICIENT_BALANCE,
    };
  }

  const remainingBalance = availableBalance - withdrawAmount;
  DevLogger.log('validateBalance: Balance is sufficient', {
    withdrawAmount,
    availableBalance,
    remainingBalance,
    percentageUsed:
      ((withdrawAmount / availableBalance) * 100).toFixed(2) + '%',
  });

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
 * Get maximum order value based on leverage and order type
 * Based on HyperLiquid contract specifications
 */
export function getMaxOrderValue(
  maxLeverage: number,
  orderType: 'market' | 'limit',
): number {
  let marketLimit: number;

  if (maxLeverage >= 25) {
    marketLimit = HYPERLIQUID_ORDER_LIMITS.MARKET_ORDER_LIMITS.HIGH_LEVERAGE;
  } else if (maxLeverage >= 20) {
    marketLimit =
      HYPERLIQUID_ORDER_LIMITS.MARKET_ORDER_LIMITS.MEDIUM_HIGH_LEVERAGE;
  } else if (maxLeverage >= 10) {
    marketLimit = HYPERLIQUID_ORDER_LIMITS.MARKET_ORDER_LIMITS.MEDIUM_LEVERAGE;
  } else {
    marketLimit = HYPERLIQUID_ORDER_LIMITS.MARKET_ORDER_LIMITS.LOW_LEVERAGE;
  }

  return orderType === 'limit'
    ? marketLimit * HYPERLIQUID_ORDER_LIMITS.LIMIT_ORDER_MULTIPLIER
    : marketLimit;
}

/**
 * Validate order parameters
 * Basic validation - checks required fields are present
 * Amount validation (size/USD) is handled by validateOrder
 */
export function validateOrderParams(params: {
  coin?: string;
  size?: string;
  price?: string;
  orderType?: 'market' | 'limit';
}): { isValid: boolean; error?: string } {
  if (!params.coin) {
    return {
      isValid: false,
      error: PERPS_ERROR_CODES.ORDER_COIN_REQUIRED,
    };
  }

  // Note: Size validation removed - validateOrder handles amount validation using USD as source of truth

  // Require price for limit orders
  if (params.orderType === 'limit' && !params.price) {
    return {
      isValid: false,
      error: PERPS_ERROR_CODES.ORDER_LIMIT_PRICE_REQUIRED,
    };
  }

  if (params.price && parseFloat(params.price) <= 0) {
    return {
      isValid: false,
      error: PERPS_ERROR_CODES.ORDER_PRICE_POSITIVE,
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
    return {
      isValid: false,
      error: PERPS_ERROR_CODES.ORDER_UNKNOWN_COIN,
    };
  }

  return { isValid: true };
}
