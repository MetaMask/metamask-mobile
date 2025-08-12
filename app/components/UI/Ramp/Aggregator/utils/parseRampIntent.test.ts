import parseRampIntent from './parseRampIntent';
import { SOLANA_NETWORK, SOLANA_ASSET_ID } from '../types';

describe('parseRampIntent', () => {
  describe('Legacy EVM Support', () => {
    it('returns undefined if pathParams do not contain necessary fields', () => {
      const pathParams = {};
      const result = parseRampIntent(pathParams);
      expect(result).toBeUndefined();
    });

    it('returns a RampIntent object if pathParams contain necessary fields', () => {
      const pathParams = {
        address: '0x1234567890',
        chainId: '1',
        amount: '10',
        currency: 'usd',
      };
      const result = parseRampIntent(pathParams);
      expect(result).toEqual({
        address: '0x1234567890',
        chainId: '1',
        amount: '10',
        currency: 'usd',
      });
    });

    it('handles legacy EVM format with chainId/address in currency parameter', () => {
      const pathParams = {
        amount: '10',
        currency: '1/0x1234567890123456789012345678901234567890',
      };
      const result = parseRampIntent(pathParams);
      expect(result).toEqual({
        chainId: '1',
        address: '0x1234567890123456789012345678901234567890',
        amount: '10',
        currency: 'usd',
      });
    });

    it('defaults to Ethereum mainnet if address is provided but chainId is missing', () => {
      const pathParams = {
        address: '0x1234567890',
        amount: '10',
      };
      const result = parseRampIntent(pathParams);
      expect(result).toEqual({
        address: '0x1234567890',
        chainId: '1',
        amount: '10',
      });
    });

    it('removes undefined values from the result', () => {
      const pathParams = {
        address: '0x1234567890',
        chainId: '1',
        amount: undefined,
        currency: undefined,
      };
      const result = parseRampIntent(pathParams);
      expect(result).toEqual({
        address: '0x1234567890',
        chainId: '1',
      });
    });
  });

  describe('CAIP-19 Support', () => {
    it('handles CAIP-19 format in assetId parameter (preferred format)', () => {
      const pathParams = {
        assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        amount: '10',
        currency: 'usd',
      };
      const result = parseRampIntent(pathParams);
      expect(result).toEqual({
        assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        chainId: 'eip155:1',
        amount: '10',
        currency: 'usd',
      });
    });

    it('handles CAIP-19 format in chainId parameter (alternative format)', () => {
      const pathParams = {
        chainId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        amount: '10',
        currency: 'usd',
      };
      const result = parseRampIntent(pathParams);
      expect(result).toEqual({
        chainId: 'eip155:1',
        assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        amount: '10',
        currency: 'usd',
      });
    });

    it('handles Solana CAIP-19 format in assetId parameter', () => {
      const pathParams = {
        assetId: SOLANA_ASSET_ID,
        amount: '10',
        currency: 'usd',
      };
      const result = parseRampIntent(pathParams);
      expect(result).toEqual({
        assetId: SOLANA_ASSET_ID,
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        amount: '10',
        currency: 'usd',
      });
    });

    it('handles Solana CAIP-19 format in chainId parameter', () => {
      const pathParams = {
        chainId: `${SOLANA_NETWORK}/${SOLANA_ASSET_ID}`,
        amount: '10',
        currency: 'usd',
      };
      const result = parseRampIntent(pathParams);
      expect(result).toEqual({
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        assetId: `${SOLANA_NETWORK}/${SOLANA_ASSET_ID}`,
        amount: '10',
        currency: 'usd',
      });
    });

    it('handles CAIP-19 format with slip44 asset type', () => {
      const pathParams = {
        assetId: 'eip155:1/slip44:60',
        amount: '10',
        currency: 'usd',
      };
      const result = parseRampIntent(pathParams);
      expect(result).toEqual({
        assetId: 'eip155:1/slip44:60',
        chainId: 'eip155:1',
        amount: '10',
        currency: 'usd',
      });
    });

    it('removes address when assetId is present to avoid conflicts', () => {
      const pathParams = {
        assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        address: '0x1234567890', // This should be removed
        amount: '10',
        currency: 'usd',
      };
      const result = parseRampIntent(pathParams);
      expect(result).toEqual({
        assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        chainId: 'eip155:1',
        amount: '10',
        currency: 'usd',
      });
      // Ensure address was removed
      expect(result?.address).toBeUndefined();
    });
  });

  describe('Mixed Format Support', () => {
    it('handles legacy EVM chainId with CAIP-19 assetId', () => {
      const pathParams = {
        chainId: '1',
        assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        amount: '10',
        currency: 'usd',
      };
      const result = parseRampIntent(pathParams);
      expect(result).toEqual({
        chainId: '1',
        assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        amount: '10',
        currency: 'usd',
      });
    });

    it('handles CAIP-19 chainId with legacy EVM address', () => {
      const pathParams = {
        chainId: 'eip155:1',
        address: '0x1234567890',
        amount: '10',
        currency: 'usd',
      };
      const result = parseRampIntent(pathParams);
      expect(result).toEqual({
        chainId: 'eip155:1',
        address: '0x1234567890',
        amount: '10',
        currency: 'usd',
      });
    });

    it('prioritizes assetId over chainId when both contain CAIP-19 format', () => {
      const pathParams = {
        chainId: 'eip155:137/erc20:0x1234567890123456789012345678901234567890',
        assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        amount: '10',
        currency: 'usd',
      };
      const result = parseRampIntent(pathParams);
      expect(result).toEqual({
        chainId: 'eip155:137/erc20:0x1234567890123456789012345678901234567890',
        assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        amount: '10',
        currency: 'usd',
      });
    });
  });

  describe('Edge Cases', () => {
    it('returns undefined for empty rampPath', () => {
      const pathParams = {};
      const result = parseRampIntent(pathParams);
      expect(result).toBeUndefined();
    });

    it('returns undefined for rampPath with only undefined values', () => {
      const pathParams = {
        address: undefined,
        chainId: undefined,
        amount: undefined,
        currency: undefined,
        assetId: undefined,
      };
      const result = parseRampIntent(pathParams);
      expect(result).toBeUndefined();
    });

    it('handles invalid legacy EVM format in currency parameter', () => {
      const pathParams = {
        amount: '10',
        currency: 'invalid/format',
      };
      const result = parseRampIntent(pathParams);
      expect(result).toEqual({
        amount: '10',
        currency: 'invalid/format',
      });
    });

    it('handles partial CAIP-19 format gracefully', () => {
      const pathParams = {
        chainId: 'eip155:1',
        amount: '10',
        currency: 'usd',
      };
      const result = parseRampIntent(pathParams);
      expect(result).toEqual({
        chainId: 'eip155:1',
        amount: '10',
        currency: 'usd',
      });
    });

    it('handles invalid CAIP-19 format gracefully', () => {
      const pathParams = {
        assetId: 'invalid:format',
        amount: '10',
        currency: 'usd',
      };
      const result = parseRampIntent(pathParams);
      expect(result).toEqual({
        assetId: 'invalid:format',
        amount: '10',
        currency: 'usd',
      });
    });
  });
});
