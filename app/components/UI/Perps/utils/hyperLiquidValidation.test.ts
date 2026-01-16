/**
 * Unit tests for HyperLiquid validation utilities
 */

import {
  createErrorResult,
  validateWithdrawalParams,
  validateDepositParams,
  validateAssetSupport,
  validateBalance,
  applyPathFilters,
  getSupportedPaths,
  validateOrderParams,
  validateCoinExists,
  getMaxOrderValue,
} from './hyperLiquidValidation';
import type { CaipAssetId, Hex } from '@metamask/utils';
import type { GetSupportedPathsParams } from '../controllers/types';
import { PERPS_ERROR_CODES } from '../controllers/perpsErrorCodes';

jest.mock('@metamask/utils', () => ({
  isValidHexAddress: (address: string) => /^0x[0-9a-fA-F]{40}$/.test(address),
}));

jest.mock('../constants/hyperLiquidConfig', () => ({
  HYPERLIQUID_ASSET_CONFIGS: {
    USDC: {
      mainnet:
        'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831/default' as CaipAssetId,
      testnet:
        'eip155:421614/erc20:0x1234567890123456789012345678901234567890/default' as CaipAssetId,
    },
    ETH: {
      mainnet:
        'eip155:42161/erc20:0x82af49447d8a07e3bd95bd0d56f35241523fbab1/default' as CaipAssetId,
      testnet:
        'eip155:421614/erc20:0x9876543210987654321098765432109876543210/default' as CaipAssetId,
    },
  },
  getSupportedAssets: (isTestnet: boolean) => [
    isTestnet
      ? ('eip155:421614/erc20:0x1234567890123456789012345678901234567890/default' as CaipAssetId)
      : ('eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831/default' as CaipAssetId),
    isTestnet
      ? ('eip155:421614/erc20:0x9876543210987654321098765432109876543210/default' as CaipAssetId)
      : ('eip155:42161/erc20:0x82af49447d8a07e3bd95bd0d56f35241523fbab1/default' as CaipAssetId),
  ],
  TRADING_DEFAULTS: {
    amount: {
      mainnet: 5,
      testnet: 11,
    },
  },
}));

jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: {
    log: jest.fn(),
  },
}));

jest.mock('../constants/perpsConfig', () => ({
  HYPERLIQUID_ORDER_LIMITS: {
    MARKET_ORDER_LIMITS: {
      HIGH_LEVERAGE: 15_000_000,
      MEDIUM_HIGH_LEVERAGE: 5_000_000,
      MEDIUM_LEVERAGE: 2_000_000,
      LOW_LEVERAGE: 500_000,
    },
    LIMIT_ORDER_MULTIPLIER: 10,
  },
}));

describe('hyperLiquidValidation', () => {
  describe('createErrorResult', () => {
    it('should create error result with Error message', () => {
      const error = new Error('Test error');
      const defaultResponse = { success: true };

      const result = createErrorResult(error, defaultResponse);

      expect(result).toEqual({
        success: false,
        error: 'Test error',
      });
    });

    it('should create error result with unknown error', () => {
      const error = 'string error';
      const defaultResponse = { success: true, data: null };

      const result = createErrorResult(error, defaultResponse);

      expect(result).toEqual({
        success: false,
        error: PERPS_ERROR_CODES.UNKNOWN_ERROR,
        data: null,
      });
    });

    it('should preserve default response properties', () => {
      const error = new Error('Test error');
      const defaultResponse = { success: true, txHash: '0x123', amount: '100' };

      const result = createErrorResult(error, defaultResponse);

      expect(result).toEqual({
        success: false,
        error: 'Test error',
        txHash: '0x123',
        amount: '100',
      });
    });
  });

  describe('validateWithdrawalParams', () => {
    it('should validate correct parameters', () => {
      const params = {
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831/default' as CaipAssetId,
        amount: '100',
        destination: '0x1234567890123456789012345678901234567890' as Hex,
      };

      const result = validateWithdrawalParams(params);

      expect(result).toEqual({ isValid: true });
    });

    it('should require assetId', () => {
      const params = {
        amount: '100',
        destination: '0x1234567890123456789012345678901234567890' as Hex,
      };

      const result = validateWithdrawalParams(params);

      expect(result).toEqual({
        isValid: false,
        error: PERPS_ERROR_CODES.WITHDRAW_ASSET_ID_REQUIRED,
      });
    });

    it('should require positive amount', () => {
      const params = {
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831/default' as CaipAssetId,
        amount: '0',
      };

      const result = validateWithdrawalParams(params);

      expect(result).toEqual({
        isValid: false,
        error: PERPS_ERROR_CODES.WITHDRAW_AMOUNT_POSITIVE,
      });
    });

    it('should validate destination address format', () => {
      const params = {
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831/default' as CaipAssetId,
        amount: '100',
        destination: 'invalid-address' as Hex,
      };

      const result = validateWithdrawalParams(params);

      expect(result).toEqual({
        isValid: false,
        error: PERPS_ERROR_CODES.WITHDRAW_INVALID_DESTINATION,
      });
    });

    it('should handle missing amount', () => {
      const params = {
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831/default' as CaipAssetId,
      };

      const result = validateWithdrawalParams(params);

      expect(result).toEqual({
        isValid: false,
        error: PERPS_ERROR_CODES.WITHDRAW_AMOUNT_REQUIRED,
      });
    });

    it('should handle negative amount', () => {
      const params = {
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831/default' as CaipAssetId,
        amount: '-10',
      };

      const result = validateWithdrawalParams(params);

      expect(result).toEqual({
        isValid: false,
        error: PERPS_ERROR_CODES.WITHDRAW_AMOUNT_POSITIVE,
      });
    });

    it('should allow missing destination', () => {
      const params = {
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831/default' as CaipAssetId,
        amount: '100',
      };

      const result = validateWithdrawalParams(params);

      expect(result).toEqual({ isValid: true });
    });
  });

  describe('validateDepositParams', () => {
    it('should validate correct parameters on mainnet', () => {
      const params = {
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831/default' as CaipAssetId,
        amount: '10',
        isTestnet: false,
      };

      const result = validateDepositParams(params);

      expect(result).toEqual({ isValid: true });
    });

    it('should validate correct parameters on testnet', () => {
      const params = {
        assetId:
          'eip155:421614/erc20:0x1234567890123456789012345678901234567890/default' as CaipAssetId,
        amount: '15',
        isTestnet: true,
      };

      const result = validateDepositParams(params);

      expect(result).toEqual({ isValid: true });
    });

    it('should require assetId', () => {
      const params = {
        amount: '100',
        isTestnet: false,
      };

      const result = validateDepositParams(params);

      expect(result).toEqual({
        isValid: false,
        error: PERPS_ERROR_CODES.DEPOSIT_ASSET_ID_REQUIRED,
      });
    });

    it('should require amount', () => {
      const params = {
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831/default' as CaipAssetId,
        isTestnet: false,
      };

      const result = validateDepositParams(params);

      expect(result).toEqual({
        isValid: false,
        error: PERPS_ERROR_CODES.DEPOSIT_AMOUNT_REQUIRED,
      });
    });

    it('should require positive amount', () => {
      const params = {
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831/default' as CaipAssetId,
        amount: '0',
        isTestnet: false,
      };

      const result = validateDepositParams(params);

      expect(result).toEqual({
        isValid: false,
        error: PERPS_ERROR_CODES.DEPOSIT_AMOUNT_POSITIVE,
      });
    });

    it('should reject negative amount', () => {
      const params = {
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831/default' as CaipAssetId,
        amount: '-10',
        isTestnet: false,
      };

      const result = validateDepositParams(params);

      expect(result).toEqual({
        isValid: false,
        error: PERPS_ERROR_CODES.DEPOSIT_AMOUNT_POSITIVE,
      });
    });

    it('should reject amount below minimum on mainnet', () => {
      const params = {
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831/default' as CaipAssetId,
        amount: '4.99',
        isTestnet: false,
      };

      const result = validateDepositParams(params);

      expect(result).toEqual({
        isValid: false,
        error: PERPS_ERROR_CODES.DEPOSIT_MINIMUM_AMOUNT,
      });
    });

    it('should reject amount below minimum on testnet', () => {
      const params = {
        assetId:
          'eip155:421614/erc20:0x1234567890123456789012345678901234567890/default' as CaipAssetId,
        amount: '10.99',
        isTestnet: true,
      };

      const result = validateDepositParams(params);

      expect(result).toEqual({
        isValid: false,
        error: PERPS_ERROR_CODES.DEPOSIT_MINIMUM_AMOUNT,
      });
    });

    it('should accept amount exactly at minimum on mainnet', () => {
      const params = {
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831/default' as CaipAssetId,
        amount: '5',
        isTestnet: false,
      };

      const result = validateDepositParams(params);

      expect(result).toEqual({ isValid: true });
    });

    it('should accept amount exactly at minimum on testnet', () => {
      const params = {
        assetId:
          'eip155:421614/erc20:0x1234567890123456789012345678901234567890/default' as CaipAssetId,
        amount: '11',
        isTestnet: true,
      };

      const result = validateDepositParams(params);

      expect(result).toEqual({ isValid: true });
    });

    it('should default to mainnet when isTestnet is not provided', () => {
      const params = {
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831/default' as CaipAssetId,
        amount: '4',
      };

      const result = validateDepositParams(params);

      expect(result).toEqual({
        isValid: false,
        error: PERPS_ERROR_CODES.DEPOSIT_MINIMUM_AMOUNT,
      });
    });

    it('should handle NaN amount', () => {
      const params = {
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831/default' as CaipAssetId,
        amount: 'invalid',
        isTestnet: false,
      };

      const result = validateDepositParams(params);

      expect(result).toEqual({
        isValid: false,
        error: PERPS_ERROR_CODES.DEPOSIT_AMOUNT_POSITIVE,
      });
    });
  });

  describe('validateAssetSupport', () => {
    it('should validate supported asset', () => {
      const assetId =
        'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831/default' as CaipAssetId;
      const supportedRoutes = [
        { assetId },
        {
          assetId:
            'eip155:42161/erc20:0x82af49447d8a07e3bd95bd0d56f35241523fbab1/default' as CaipAssetId,
        },
      ];

      const result = validateAssetSupport(assetId, supportedRoutes);

      expect(result).toEqual({ isValid: true });
    });

    it('should reject unsupported asset', () => {
      const assetId = 'eip155:42161/erc20:0xUNSUPPORTED/default' as CaipAssetId;
      const supportedRoutes = [
        {
          assetId:
            'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831/default' as CaipAssetId,
        },
        {
          assetId:
            'eip155:42161/erc20:0x82af49447d8a07e3bd95bd0d56f35241523fbab1/default' as CaipAssetId,
        },
      ];

      const result = validateAssetSupport(assetId, supportedRoutes);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe(PERPS_ERROR_CODES.WITHDRAW_ASSET_NOT_SUPPORTED);
    });

    it('should handle empty supported routes', () => {
      const assetId =
        'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831/default' as CaipAssetId;
      const supportedRoutes: { assetId: CaipAssetId }[] = [];

      const result = validateAssetSupport(assetId, supportedRoutes);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe(PERPS_ERROR_CODES.WITHDRAW_ASSET_NOT_SUPPORTED);
    });

    it('should support case-insensitive asset matching for contract addresses', () => {
      const assetIdUpperCase =
        'eip155:42161/erc20:0xAF88D065E77C8CC2239327C5EDB3A432268E5831/default' as CaipAssetId;
      const supportedRoutes = [
        {
          assetId:
            'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831/default' as CaipAssetId,
        },
      ];

      const result = validateAssetSupport(assetIdUpperCase, supportedRoutes);

      expect(result).toEqual({ isValid: true });
    });

    it('should support case-insensitive asset matching with mixed case', () => {
      const assetIdMixedCase =
        'eip155:42161/erc20:0xaF88d065E77c8Cc2239327c5eDb3A432268E5831/default' as CaipAssetId;
      const supportedRoutes = [
        {
          assetId:
            'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831/default' as CaipAssetId,
        },
      ];

      const result = validateAssetSupport(assetIdMixedCase, supportedRoutes);

      // Case-insensitive matching should make this valid
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateBalance', () => {
    it('should validate sufficient balance', () => {
      const result = validateBalance(100, 200);

      expect(result).toEqual({ isValid: true });
    });

    it('should reject insufficient balance', () => {
      const result = validateBalance(150, 100);

      expect(result).toEqual({
        isValid: false,
        error: PERPS_ERROR_CODES.WITHDRAW_INSUFFICIENT_BALANCE,
      });
    });

    it('should allow exact balance match', () => {
      const result = validateBalance(100, 100);

      expect(result).toEqual({ isValid: true });
    });

    it('should handle zero balance', () => {
      const result = validateBalance(10, 0);

      expect(result).toEqual({
        isValid: false,
        error: PERPS_ERROR_CODES.WITHDRAW_INSUFFICIENT_BALANCE,
      });
    });
  });

  describe('applyPathFilters', () => {
    const mockAssets = [
      'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831/default' as CaipAssetId,
      'eip155:42161/erc20:0x82af49447d8a07e3bd95bd0d56f35241523fbab1/default' as CaipAssetId,
      'eip155:1/erc20:0x1234567890123456789012345678901234567890/default' as CaipAssetId,
    ];

    it('should return all assets when no params provided', () => {
      const result = applyPathFilters(mockAssets);

      expect(result).toEqual(mockAssets);
    });

    it('should filter by chainId', () => {
      const params: GetSupportedPathsParams = {
        chainId: 'eip155:42161',
      };

      const result = applyPathFilters(mockAssets, params);

      // The filter will keep assets that start with the chainId prefix
      expect(result.length).toBe(2);
      expect(result).toContain(
        'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831/default',
      );
      expect(result).toContain(
        'eip155:42161/erc20:0x82af49447d8a07e3bd95bd0d56f35241523fbab1/default',
      );
      expect(result).not.toContain(
        'eip155:1/erc20:0x1234567890123456789012345678901234567890/default',
      );
    });

    it('should filter by symbol (mainnet)', () => {
      const params: GetSupportedPathsParams = {
        symbol: 'USDC',
        isTestnet: false,
      };

      const result = applyPathFilters(mockAssets, params);

      expect(result).toEqual([
        'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831/default',
      ]);
    });

    it('should filter by symbol (testnet)', () => {
      const params: GetSupportedPathsParams = {
        symbol: 'USDC',
        isTestnet: true,
      };

      const result = applyPathFilters(mockAssets, params);

      expect(result).toEqual([
        'eip155:421614/erc20:0x1234567890123456789012345678901234567890/default',
      ]);
    });

    it('should filter by assetId (case insensitive)', () => {
      const params: GetSupportedPathsParams = {
        assetId:
          'eip155:42161/erc20:0xAF88D065E77C8CC2239327C5EDB3A432268E5831/default' as CaipAssetId,
      };

      const result = applyPathFilters(mockAssets, params);

      expect(result).toEqual([
        'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831/default',
      ]);
    });

    it('should combine multiple filters', () => {
      const params: GetSupportedPathsParams = {
        chainId: 'eip155:42161',
        symbol: 'ETH',
        isTestnet: false,
      };

      const result = applyPathFilters(mockAssets, params);

      expect(result).toEqual([
        'eip155:42161/erc20:0x82af49447d8a07e3bd95bd0d56f35241523fbab1/default',
      ]);
    });

    it('should handle unknown symbol', () => {
      const params: GetSupportedPathsParams = {
        symbol: 'UNKNOWN',
      };

      const result = applyPathFilters(mockAssets, params);

      expect(result).toEqual(mockAssets); // Should not filter if symbol not found
    });
  });

  describe('getSupportedPaths', () => {
    it('should return mainnet assets by default', () => {
      const result = getSupportedPaths();

      expect(result).toEqual([
        'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831/default',
        'eip155:42161/erc20:0x82af49447d8a07e3bd95bd0d56f35241523fbab1/default',
      ]);
    });

    it('should return testnet assets when requested', () => {
      const params: GetSupportedPathsParams = {
        isTestnet: true,
      };

      const result = getSupportedPaths(params);

      expect(result).toEqual([
        'eip155:421614/erc20:0x1234567890123456789012345678901234567890/default',
        'eip155:421614/erc20:0x9876543210987654321098765432109876543210/default',
      ]);
    });

    it('should apply filters to assets', () => {
      const params: GetSupportedPathsParams = {
        symbol: 'USDC',
        isTestnet: false,
      };

      const result = getSupportedPaths(params);

      expect(result).toEqual([
        'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831/default',
      ]);
    });
  });

  describe('validateOrderParams', () => {
    it('should validate correct order parameters', () => {
      const params = {
        coin: 'BTC',
        size: '0.1',
        price: '50000',
      };

      const result = validateOrderParams(params);

      expect(result).toEqual({ isValid: true });
    });

    it('should require coin', () => {
      const params = {
        size: '0.1',
        price: '50000',
      };

      const result = validateOrderParams(params);

      expect(result).toEqual({
        isValid: false,
        error: PERPS_ERROR_CODES.ORDER_COIN_REQUIRED,
      });
    });

    it('should require positive price if provided', () => {
      const params = {
        coin: 'BTC',
        size: '0.1',
        price: '-50000',
      };

      const result = validateOrderParams(params);

      expect(result).toEqual({
        isValid: false,
        error: PERPS_ERROR_CODES.ORDER_PRICE_POSITIVE,
      });
    });

    it('should allow missing price for market orders', () => {
      const params = {
        coin: 'BTC',
        size: '0.1',
        orderType: 'market' as const,
      };

      const result = validateOrderParams(params);

      expect(result).toEqual({ isValid: true });
    });

    it('should allow missing price when orderType is not specified', () => {
      const params = {
        coin: 'BTC',
        size: '0.1',
      };

      const result = validateOrderParams(params);

      expect(result).toEqual({ isValid: true });
    });

    it('should reject limit orders without price', () => {
      const params = {
        coin: 'BTC',
        size: '0.1',
        orderType: 'limit' as const,
      };

      const result = validateOrderParams(params);

      expect(result).toEqual({
        isValid: false,
        error: PERPS_ERROR_CODES.ORDER_LIMIT_PRICE_REQUIRED,
      });
    });
  });

  describe('validateCoinExists', () => {
    let coinToAssetId: Map<string, number>;

    beforeEach(() => {
      coinToAssetId = new Map([
        ['BTC', 0],
        ['ETH', 1],
        ['SOL', 2],
      ]);
    });

    it('should validate existing coin', () => {
      const result = validateCoinExists('BTC', coinToAssetId);

      expect(result).toEqual({ isValid: true });
    });

    it('should reject unknown coin', () => {
      const result = validateCoinExists('UNKNOWN', coinToAssetId);

      expect(result).toEqual({
        isValid: false,
        error: PERPS_ERROR_CODES.ORDER_UNKNOWN_COIN,
      });
    });

    it('should handle empty mapping', () => {
      const emptyMap = new Map<string, number>();
      const result = validateCoinExists('BTC', emptyMap);

      expect(result).toEqual({
        isValid: false,
        error: PERPS_ERROR_CODES.ORDER_UNKNOWN_COIN,
      });
    });

    it('should be case sensitive', () => {
      const result = validateCoinExists('btc', coinToAssetId);

      expect(result).toEqual({
        isValid: false,
        error: PERPS_ERROR_CODES.ORDER_UNKNOWN_COIN,
      });
    });
  });

  describe('getMaxOrderValue', () => {
    describe('market orders', () => {
      it('should return high leverage limit for maxLeverage >= 25', () => {
        // Arrange
        const maxLeverage = 25;
        const orderType = 'market' as const;

        // Act
        const result = getMaxOrderValue(maxLeverage, orderType);

        // Assert
        expect(result).toBe(15_000_000);
      });

      it('should return high leverage limit for maxLeverage > 25', () => {
        // Arrange
        const maxLeverage = 50;
        const orderType = 'market' as const;

        // Act
        const result = getMaxOrderValue(maxLeverage, orderType);

        // Assert
        expect(result).toBe(15_000_000);
      });

      it('should return medium high leverage limit for maxLeverage >= 20 and < 25', () => {
        // Arrange
        const maxLeverage = 20;
        const orderType = 'market' as const;

        // Act
        const result = getMaxOrderValue(maxLeverage, orderType);

        // Assert
        expect(result).toBe(5_000_000);
      });

      it('should return medium high leverage limit for maxLeverage between 20 and 25', () => {
        // Arrange
        const maxLeverage = 22.5;
        const orderType = 'market' as const;

        // Act
        const result = getMaxOrderValue(maxLeverage, orderType);

        // Assert
        expect(result).toBe(5_000_000);
      });

      it('should return medium leverage limit for maxLeverage >= 10 and < 20', () => {
        // Arrange
        const maxLeverage = 10;
        const orderType = 'market' as const;

        // Act
        const result = getMaxOrderValue(maxLeverage, orderType);

        // Assert
        expect(result).toBe(2_000_000);
      });

      it('should return medium leverage limit for maxLeverage between 10 and 20', () => {
        // Arrange
        const maxLeverage = 15;
        const orderType = 'market' as const;

        // Act
        const result = getMaxOrderValue(maxLeverage, orderType);

        // Assert
        expect(result).toBe(2_000_000);
      });

      it('should return low leverage limit for maxLeverage < 10', () => {
        // Arrange
        const maxLeverage = 9.9;
        const orderType = 'market' as const;

        // Act
        const result = getMaxOrderValue(maxLeverage, orderType);

        // Assert
        expect(result).toBe(500_000);
      });

      it('should return low leverage limit for maxLeverage = 0', () => {
        // Arrange
        const maxLeverage = 0;
        const orderType = 'market' as const;

        // Act
        const result = getMaxOrderValue(maxLeverage, orderType);

        // Assert
        expect(result).toBe(500_000);
      });

      it('should return low leverage limit for negative maxLeverage', () => {
        // Arrange
        const maxLeverage = -5;
        const orderType = 'market' as const;

        // Act
        const result = getMaxOrderValue(maxLeverage, orderType);

        // Assert
        expect(result).toBe(500_000);
      });
    });

    describe('limit orders', () => {
      it('should return high leverage limit multiplied by 10 for maxLeverage >= 25', () => {
        // Arrange
        const maxLeverage = 25;
        const orderType = 'limit' as const;

        // Act
        const result = getMaxOrderValue(maxLeverage, orderType);

        // Assert
        expect(result).toBe(150_000_000);
      });

      it('should return high leverage limit multiplied by 10 for maxLeverage > 25', () => {
        // Arrange
        const maxLeverage = 50;
        const orderType = 'limit' as const;

        // Act
        const result = getMaxOrderValue(maxLeverage, orderType);

        // Assert
        expect(result).toBe(150_000_000);
      });

      it('should return medium high leverage limit multiplied by 10 for maxLeverage >= 20 and < 25', () => {
        // Arrange
        const maxLeverage = 20;
        const orderType = 'limit' as const;

        // Act
        const result = getMaxOrderValue(maxLeverage, orderType);

        // Assert
        expect(result).toBe(50_000_000);
      });

      it('should return medium high leverage limit multiplied by 10 for maxLeverage between 20 and 25', () => {
        // Arrange
        const maxLeverage = 22.5;
        const orderType = 'limit' as const;

        // Act
        const result = getMaxOrderValue(maxLeverage, orderType);

        // Assert
        expect(result).toBe(50_000_000);
      });

      it('should return medium leverage limit multiplied by 10 for maxLeverage >= 10 and < 20', () => {
        // Arrange
        const maxLeverage = 10;
        const orderType = 'limit' as const;

        // Act
        const result = getMaxOrderValue(maxLeverage, orderType);

        // Assert
        expect(result).toBe(20_000_000);
      });

      it('should return medium leverage limit multiplied by 10 for maxLeverage between 10 and 20', () => {
        // Arrange
        const maxLeverage = 15;
        const orderType = 'limit' as const;

        // Act
        const result = getMaxOrderValue(maxLeverage, orderType);

        // Assert
        expect(result).toBe(20_000_000);
      });

      it('should return low leverage limit multiplied by 10 for maxLeverage < 10', () => {
        // Arrange
        const maxLeverage = 9.9;
        const orderType = 'limit' as const;

        // Act
        const result = getMaxOrderValue(maxLeverage, orderType);

        // Assert
        expect(result).toBe(5_000_000);
      });

      it('should return low leverage limit multiplied by 10 for maxLeverage = 0', () => {
        // Arrange
        const maxLeverage = 0;
        const orderType = 'limit' as const;

        // Act
        const result = getMaxOrderValue(maxLeverage, orderType);

        // Assert
        expect(result).toBe(5_000_000);
      });

      it('should return low leverage limit multiplied by 10 for negative maxLeverage', () => {
        // Arrange
        const maxLeverage = -5;
        const orderType = 'limit' as const;

        // Act
        const result = getMaxOrderValue(maxLeverage, orderType);

        // Assert
        expect(result).toBe(5_000_000);
      });
    });

    describe('boundary conditions', () => {
      it('should handle exact boundary at 25 leverage for market orders', () => {
        // Arrange
        const maxLeverage = 25;
        const orderType = 'market' as const;

        // Act
        const result = getMaxOrderValue(maxLeverage, orderType);

        // Assert
        expect(result).toBe(15_000_000);
      });

      it('should handle exact boundary at 20 leverage for market orders', () => {
        // Arrange
        const maxLeverage = 20;
        const orderType = 'market' as const;

        // Act
        const result = getMaxOrderValue(maxLeverage, orderType);

        // Assert
        expect(result).toBe(5_000_000);
      });

      it('should handle exact boundary at 10 leverage for market orders', () => {
        // Arrange
        const maxLeverage = 10;
        const orderType = 'market' as const;

        // Act
        const result = getMaxOrderValue(maxLeverage, orderType);

        // Assert
        expect(result).toBe(2_000_000);
      });

      it('should handle exact boundary at 25 leverage for limit orders', () => {
        // Arrange
        const maxLeverage = 25;
        const orderType = 'limit' as const;

        // Act
        const result = getMaxOrderValue(maxLeverage, orderType);

        // Assert
        expect(result).toBe(150_000_000);
      });

      it('should handle exact boundary at 20 leverage for limit orders', () => {
        // Arrange
        const maxLeverage = 20;
        const orderType = 'limit' as const;

        // Act
        const result = getMaxOrderValue(maxLeverage, orderType);

        // Assert
        expect(result).toBe(50_000_000);
      });

      it('should handle exact boundary at 10 leverage for limit orders', () => {
        // Arrange
        const maxLeverage = 10;
        const orderType = 'limit' as const;

        // Act
        const result = getMaxOrderValue(maxLeverage, orderType);

        // Assert
        expect(result).toBe(20_000_000);
      });
    });

    describe('edge cases', () => {
      it('should handle very large leverage values', () => {
        // Arrange
        const maxLeverage = 1000;
        const orderType = 'market' as const;

        // Act
        const result = getMaxOrderValue(maxLeverage, orderType);

        // Assert
        expect(result).toBe(15_000_000);
      });

      it('should handle decimal leverage values', () => {
        // Arrange
        const maxLeverage = 12.345;
        const orderType = 'market' as const;

        // Act
        const result = getMaxOrderValue(maxLeverage, orderType);

        // Assert
        expect(result).toBe(2_000_000);
      });

      it('should handle very small positive leverage values', () => {
        // Arrange
        const maxLeverage = 0.001;
        const orderType = 'market' as const;

        // Act
        const result = getMaxOrderValue(maxLeverage, orderType);

        // Assert
        expect(result).toBe(500_000);
      });

      it('should handle floating point precision edge cases', () => {
        // Arrange
        const maxLeverage = 19.999999999999996; // This should stay < 20
        const orderType = 'market' as const;

        // Act
        const result = getMaxOrderValue(maxLeverage, orderType);

        // Assert
        expect(result).toBe(2_000_000);
      });
    });
  });
});
