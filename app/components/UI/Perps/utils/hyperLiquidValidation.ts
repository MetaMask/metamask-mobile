import { isValidHexAddress, type CaipAssetId, type Hex } from '@metamask/utils';
import {
  HYPERLIQUID_ASSET_CONFIGS,
  getSupportedAssets,
  TRADING_DEFAULTS,
} from '../constants/hyperLiquidConfig';
import type { GetSupportedPathsParams } from '../controllers/types';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { strings } from '../../../../../locales/i18n';

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
      error instanceof Error
        ? error.message
        : strings('perps.errors.unknownError'),
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
    const error = strings('perps.errors.withdrawValidation.assetIdRequired');
    DevLogger.log('validateWithdrawalParams: Missing assetId', {
      error,
      params,
    });
    return {
      isValid: false,
      error: `${error}. Please provide an asset ID in CAIP format (e.g., eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831)`,
    };
  }

  // Validate amount
  if (!params.amount) {
    const error = strings('perps.errors.withdrawValidation.amountRequired');
    DevLogger.log('validateWithdrawalParams: Missing amount', {
      error,
      params,
    });
    return {
      isValid: false,
      error: `${error}. Please specify the amount to withdraw`,
    };
  }

  const amount = parseFloat(params.amount);
  if (isNaN(amount) || amount <= 0) {
    const error = strings('perps.errors.withdrawValidation.amountPositive');
    DevLogger.log('validateWithdrawalParams: Invalid amount', {
      error,
      amount: params.amount,
      parsedAmount: amount,
      isNaN: isNaN(amount),
    });
    return {
      isValid: false,
      error: `${error}. Amount must be a positive number (received: ${params.amount})`,
    };
  }

  // Validate destination address if provided
  if (params.destination && !isValidHexAddress(params.destination)) {
    const error = strings(
      'perps.errors.withdrawValidation.invalidDestination',
      {
        address: params.destination,
      },
    );
    DevLogger.log('validateWithdrawalParams: Invalid destination address', {
      error,
      destination: params.destination,
      isValidHex: isValidHexAddress(params.destination),
    });
    return {
      isValid: false,
      error: `${error}. Address must be a valid Ethereum address starting with 0x`,
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
    const error = strings('perps.errors.depositValidation.assetIdRequired');
    DevLogger.log('validateDepositParams: Missing assetId', {
      error,
      params,
    });
    return {
      isValid: false,
      error: `${error}. Please provide an asset ID in CAIP format (e.g., eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831)`,
    };
  }

  // Validate amount
  if (!params.amount) {
    const error = strings('perps.errors.depositValidation.amountRequired');
    DevLogger.log('validateDepositParams: Missing amount', {
      error,
      params,
    });
    return {
      isValid: false,
      error: `${error}. Please specify the amount to deposit`,
    };
  }

  const amount = parseFloat(params.amount);
  if (isNaN(amount) || amount <= 0) {
    const error = strings('perps.errors.depositValidation.amountPositive');
    DevLogger.log('validateDepositParams: Invalid amount', {
      error,
      amount: params.amount,
      parsedAmount: amount,
      isNaN: isNaN(amount),
    });
    return {
      isValid: false,
      error: `${error}. Amount must be a positive number (received: ${params.amount})`,
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
    const error = strings('perps.errors.minimumDeposit', {
      amount: minimumAmount,
    });
    DevLogger.log('validateDepositParams: Below minimum deposit', {
      error,
      amount,
      minimumAmount,
      difference: minimumAmount - amount,
    });
    return {
      isValid: false,
      error: `${error}. Current amount: ${amount}, required minimum: ${minimumAmount}`,
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
      const supportedAssets = supportedAssetIds
        .map((path) => {
          // Extract symbol from CAIP asset ID
          const parts = path.split('/');
          const symbol = parts[parts.length - 2] || 'Unknown';
          return `${symbol} (${path})`;
        })
        .join(', ');

      const error = strings(
        'perps.errors.withdrawValidation.assetNotSupported',
        {
          assetId,
          supportedAssets,
        },
      );

      DevLogger.log('validateAssetSupport: Asset not supported', {
        error,
        assetId,
        supportedAssetIds,
        checkedCaseInsensitive: true,
      });

      return {
        isValid: false,
        error: `${error}. Supported assets: ${supportedAssets}`,
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
    const error = strings(
      'perps.errors.withdrawValidation.insufficientBalance',
      {
        available: availableBalance,
        requested: withdrawAmount,
      },
    );

    DevLogger.log('validateBalance: Insufficient balance', {
      error,
      withdrawAmount,
      availableBalance,
      shortfall,
      percentageOfAvailable:
        ((withdrawAmount / availableBalance) * 100).toFixed(2) + '%',
    });

    return {
      isValid: false,
      error: `${error}. You need ${shortfall.toFixed(
        6,
      )} more to complete this withdrawal`,
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
 * Validate order parameters
 */
export function validateOrderParams(params: {
  coin?: string;
  size?: string;
  price?: string;
}): { isValid: boolean; error?: string } {
  if (!params.coin) {
    return {
      isValid: false,
      error: strings('perps.errors.orderValidation.coinRequired'),
    };
  }

  if (!params.size || parseFloat(params.size) <= 0) {
    return {
      isValid: false,
      error: strings('perps.errors.orderValidation.sizePositive'),
    };
  }

  if (params.price && parseFloat(params.price) <= 0) {
    return {
      isValid: false,
      error: strings('perps.errors.orderValidation.pricePositive'),
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
      error: strings('perps.errors.orderValidation.unknownCoin', { coin }),
    };
  }

  return { isValid: true };
}
