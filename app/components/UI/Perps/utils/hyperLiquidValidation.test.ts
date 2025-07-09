/**
 * Unit tests for HyperLiquid validation utilities
 */

import {
  createErrorResult,
  validateWithdrawalParams,
  validateAssetSupport,
  validateBalance,
  applyPathFilters,
  getSupportedPaths,
  validateOrderParams,
  validateCoinExists,
} from './hyperLiquidValidation';
import type { CaipAssetId, Hex } from '@metamask/utils';
import type { GetSupportedPathsParams } from '../controllers/types';

// Mock dependencies
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
}));

jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: {
    log: jest.fn(),
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
        error: 'Unknown error',
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
        error: 'assetId is required for withdrawals',
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
        error: 'Amount must be a positive number',
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
        error: 'Invalid destination address format: invalid-address',
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
        error: 'Amount must be a positive number',
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
        error: 'Amount must be a positive number',
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
      expect(result.error).toContain('is not supported for withdrawals');
      expect(result.error).toContain(
        '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
      );
    });

    it('should handle empty supported routes', () => {
      const assetId =
        'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831/default' as CaipAssetId;
      const supportedRoutes: { assetId: CaipAssetId }[] = [];

      const result = validateAssetSupport(assetId, supportedRoutes);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('is not supported for withdrawals');
      expect(result.error).toContain('Supported assets: ');
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
        error: 'Insufficient balance. Available: 100, Requested: 150',
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
        error: 'Insufficient balance. Available: 0, Requested: 10',
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
        error: 'Coin is required for orders',
      });
    });

    it('should require positive size', () => {
      const params = {
        coin: 'BTC',
        size: '0',
        price: '50000',
      };

      const result = validateOrderParams(params);

      expect(result).toEqual({
        isValid: false,
        error: 'Size must be a positive number',
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
        error: 'Price must be a positive number if provided',
      });
    });

    it('should allow missing price', () => {
      const params = {
        coin: 'BTC',
        size: '0.1',
      };

      const result = validateOrderParams(params);

      expect(result).toEqual({ isValid: true });
    });

    it('should handle negative size', () => {
      const params = {
        coin: 'BTC',
        size: '-0.1',
      };

      const result = validateOrderParams(params);

      expect(result).toEqual({
        isValid: false,
        error: 'Size must be a positive number',
      });
    });

    it('should handle missing size', () => {
      const params = {
        coin: 'BTC',
        price: '50000',
      };

      const result = validateOrderParams(params);

      expect(result).toEqual({
        isValid: false,
        error: 'Size must be a positive number',
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
        error: 'Unknown coin: UNKNOWN',
      });
    });

    it('should handle empty mapping', () => {
      const emptyMap = new Map<string, number>();
      const result = validateCoinExists('BTC', emptyMap);

      expect(result).toEqual({
        isValid: false,
        error: 'Unknown coin: BTC',
      });
    });

    it('should be case sensitive', () => {
      const result = validateCoinExists('btc', coinToAssetId);

      expect(result).toEqual({
        isValid: false,
        error: 'Unknown coin: btc',
      });
    });
  });
});
