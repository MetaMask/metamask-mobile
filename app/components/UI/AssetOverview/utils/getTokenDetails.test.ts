import { zeroAddress } from 'ethereumjs-util';
import { getTokenDetails } from './getTokenDetails';
import { TokenI } from '../../Tokens/types';

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
    it('should format token details for non-EVM networks', () => {
      const result = getTokenDetails(
        mockAsset,
        false,
        undefined,
        mockEvmMetadata,
      );

      expect(result).toEqual({
        contractAddress: '0x123',
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
        true,
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
      const result = getTokenDetails(mockAsset, true, '0x456', mockEvmMetadata);

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
        true,
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
        true,
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
        true,
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
        false,
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
      const assetWithoutDecimals: TokenI = {
        ...mockAsset,
        decimals: 0,
      };

      const result = getTokenDetails(
        assetWithoutDecimals,
        false,
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
      const assetWithoutAggregators: TokenI = {
        ...mockAsset,
        aggregators: [],
      };

      const result = getTokenDetails(
        assetWithoutAggregators,
        false,
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
