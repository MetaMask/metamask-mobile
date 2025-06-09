import { zeroAddress } from 'ethereumjs-util';
import { getTokenDetails } from './getTokenDetails';
import { TokenI } from '../../Tokens/types';

// In test file
jest.mock('@metamask/utils', () => ({
  ...jest.requireActual('@metamask/utils'),
  parseCaipAssetType: jest.fn(),
}));

import { parseCaipAssetType } from '@metamask/utils';

describe('getTokenDetails', () => {
  // Base test data
  const mockAsset: TokenI = {
    address: '0x123',
    symbol: 'TEST',
    decimals: 18,
    aggregators: ['uniswap', '1inch'],
    isETH: false,
    chainId: '0x1',
    image: 'https://example.com/image.png',
    name: 'Test Token',
    balance: '1000000000000000000',
    logo: 'https://example.com/logo.png',
  };

  const mockEvmMetadata = {
    decimals: 18,
    aggregators: ['uniswap', '1inch'],
  };

  describe('Network-specific behavior', () => {
    it('should format token details for non-EVM networks for spl token', () => {
      (parseCaipAssetType as jest.Mock).mockReturnValue({
        assetNamespace: 'token',
        assetReference: '0x123',
        chainId: 'test:test',
        chain: {
          namespace: 'slip44',
          reference: '0x123',
        },
      });

      const result = getTokenDetails(
        mockAsset,
        true, // isNonEvmAsset
        undefined,
        mockEvmMetadata,
      );

      expect(result).toEqual({
        contractAddress: '0x123',
        tokenDecimal: 18,
        tokenList: 'uniswap, 1inch',
      });
    });
    it('should format token details for non-EVM networks for native token', () => {
      (parseCaipAssetType as jest.Mock).mockReturnValue({
        assetNamespace: 'slip44',
        assetReference: '0x123',
        chainId: 'test:test',
        chain: {
          namespace: 'slip44',
          reference: '0x123',
        },
      });

      const result = getTokenDetails(
        mockAsset,
        true, // isNonEvmAsset
        undefined,
        mockEvmMetadata,
      );

      expect(result).toEqual({
        contractAddress: null,
        tokenDecimal: 18,
        tokenList: 'uniswap, 1inch',
      });
    });

    it('should format ETH token details for EVM networks', () => {
      const ethAsset: TokenI = {
        ...mockAsset,
        isETH: true,
      };

      const result = getTokenDetails(
        ethAsset,
        false, // isNonEvmAsset
        undefined,
        mockEvmMetadata,
      );

      expect(result).toEqual({
        contractAddress: zeroAddress(),
        tokenDecimal: 18,
        tokenList: '',
      });
    });

    it('should format regular token details for EVM networks', () => {
      const result = getTokenDetails(
        mockAsset,
        false,
        '0x456',
        mockEvmMetadata,
      );

      expect(result).toEqual({
        contractAddress: '0x456',
        tokenDecimal: 18,
        tokenList: 'uniswap, 1inch',
      });
    });
  });

  describe('Metadata handling', () => {
    it('should handle missing decimals in token metadata', () => {
      const metadataWithoutDecimals = {
        aggregators: ['uniswap'],
      };

      const result = getTokenDetails(
        mockAsset,
        false,
        '0x456',
        metadataWithoutDecimals,
      );

      expect(result).toEqual({
        contractAddress: '0x456',
        tokenDecimal: null,
        tokenList: 'uniswap',
      });
    });

    it('should handle missing aggregators in token metadata', () => {
      const metadataWithoutAggregators = {
        decimals: 18,
      };

      const result = getTokenDetails(
        mockAsset,
        false,
        '0x456',
        metadataWithoutAggregators,
      );

      expect(result).toEqual({
        contractAddress: '0x456',
        tokenDecimal: 18,
        tokenList: null,
      });
    });

    it('should handle invalid aggregators type in token metadata', () => {
      const metadataWithInvalidAggregators = {
        decimals: 18,
        aggregators: 'uniswap' as unknown as string[],
      };

      const result = getTokenDetails(
        mockAsset,
        false, // isNonEvmAsset
        '0x456',
        metadataWithInvalidAggregators,
      );

      expect(result).toEqual({
        contractAddress: '0x456',
        tokenDecimal: 18,
        tokenList: null,
      });
    });
  });

  describe('Asset property handling', () => {
    it('should handle empty address in asset', () => {
      const assetWithoutAddress: TokenI = {
        ...mockAsset,
        address: '',
      };

      const result = getTokenDetails(
        assetWithoutAddress,
        true, // isNonEvmAsset
        undefined,
        mockEvmMetadata,
      );

      expect(result).toEqual({
        contractAddress: null,
        tokenDecimal: 18,
        tokenList: 'uniswap, 1inch',
      });
    });

    it('should handle zero decimals in asset', () => {
      (parseCaipAssetType as jest.Mock).mockReturnValue({
        assetNamespace: 'token',
        assetReference: '0x123',
        chainId: 'test:test',
        chain: {
          namespace: 'slip44',
          reference: '0x123',
        },
      });
      const assetWithoutDecimals: TokenI = {
        ...mockAsset,
        decimals: 0,
      };

      const result = getTokenDetails(
        assetWithoutDecimals,
        true, // isNonEvmAsset
        undefined,
        mockEvmMetadata,
      );

      expect(result).toEqual({
        contractAddress: '0x123',
        tokenDecimal: null,
        tokenList: 'uniswap, 1inch',
      });
    });

    it('should handle empty aggregators array in asset', () => {
      (parseCaipAssetType as jest.Mock).mockReturnValue({
        assetNamespace: 'token',
        assetReference: '0x123',
        chainId: 'test:test',
        chain: {
          namespace: 'slip44',
          reference: '0x123',
        },
      });
      const assetWithoutAggregators: TokenI = {
        ...mockAsset,
        aggregators: [],
      };

      const result = getTokenDetails(
        assetWithoutAggregators,
        true, // isNonEvmAsset
        undefined,
        mockEvmMetadata,
      );

      expect(result).toEqual({
        contractAddress: '0x123',
        tokenDecimal: 18,
        tokenList: null,
      });
    });
  });
});
