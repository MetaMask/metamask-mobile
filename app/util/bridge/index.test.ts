import { NATIVE_SWAPS_TOKEN_ADDRESS } from '../../constants/bridge';
import { isSwapsNativeAsset } from './index';

describe('isSwapsNativeAsset', () => {
  describe('Native Token Detection', () => {
    it('returns true for token with native address', () => {
      const token = { address: NATIVE_SWAPS_TOKEN_ADDRESS };

      const result = isSwapsNativeAsset(token);

      expect(result).toBe(true);
    });

    it('returns false for token with non-native address', () => {
      const token = { address: '0x1234567890123456789012345678901234567890' };

      const result = isSwapsNativeAsset(token);

      expect(result).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('returns false for undefined token', () => {
      const result = isSwapsNativeAsset(undefined);

      expect(result).toBe(false);
    });

    it('returns false for null token', () => {
      const result = isSwapsNativeAsset(null as unknown as undefined);

      expect(result).toBe(false);
    });

    it('returns false for token without address property', () => {
      const token = {} as { address: string };

      const result = isSwapsNativeAsset(token);

      expect(result).toBe(false);
    });

    it('returns false for token with null address', () => {
      const token = { address: null as unknown as string };

      const result = isSwapsNativeAsset(token);

      expect(result).toBe(false);
    });

    it('returns false for token with empty string address', () => {
      const token = { address: '' };

      const result = isSwapsNativeAsset(token);

      expect(result).toBe(false);
    });
  });

  describe('Address Formatting', () => {
    it('returns false for address with incorrect length', () => {
      const token = { address: '0x00' };

      const result = isSwapsNativeAsset(token);

      expect(result).toBe(false);
    });

    it('returns false for address without 0x prefix', () => {
      const token = { address: '0000000000000000000000000000000000000000' };

      const result = isSwapsNativeAsset(token);

      expect(result).toBe(false);
    });
  });

  describe('Token Object Variations', () => {
    it('returns true when token has additional properties', () => {
      const token = {
        address: NATIVE_SWAPS_TOKEN_ADDRESS,
        symbol: 'ETH',
        decimals: 18,
        name: 'Ethereum',
      };

      const result = isSwapsNativeAsset(token);

      expect(result).toBe(true);
    });

    it('returns false when token has wrong address but other properties', () => {
      const token = {
        address: '0x1111111111111111111111111111111111111111',
        symbol: 'ETH',
        decimals: 18,
        name: 'Ethereum',
      };

      const result = isSwapsNativeAsset(token);

      expect(result).toBe(false);
    });
  });
});
