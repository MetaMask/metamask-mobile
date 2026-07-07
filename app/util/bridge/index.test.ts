import { NATIVE_SWAPS_TOKEN_ADDRESS } from '../../constants/bridge';
import { getMaybeHexChainId, isSwapsNativeAsset } from './index';

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

describe('getMaybeHexChainId', () => {
  describe('absent input', () => {
    it('returns undefined when called with no argument', () => {
      expect(getMaybeHexChainId()).toBeUndefined();
    });

    it('returns undefined for an empty string', () => {
      expect(getMaybeHexChainId('')).toBeUndefined();
    });

    it('returns undefined for undefined', () => {
      expect(getMaybeHexChainId(undefined)).toBeUndefined();
    });
  });

  describe('non-EVM (CAIP-2 non-EVM) chain IDs', () => {
    it('returns undefined for a Solana CAIP-2 chain ID', () => {
      expect(
        getMaybeHexChainId('solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'),
      ).toBeUndefined();
    });

    it('returns undefined for a Bitcoin CAIP-2 chain ID', () => {
      expect(
        getMaybeHexChainId('bip122:000000000019d6689c085ae165831e93'),
      ).toBeUndefined();
    });
  });

  describe('EVM chain IDs', () => {
    it('returns the hex chain ID for an EVM CAIP-2 chain ID (Ethereum mainnet)', () => {
      expect(getMaybeHexChainId('eip155:1')).toBe('0x1');
    });

    it('returns the hex chain ID for an EVM CAIP-2 chain ID (Polygon)', () => {
      expect(getMaybeHexChainId('eip155:137')).toBe('0x89');
    });

    it('returns the hex chain ID for a decimal string chain ID', () => {
      expect(getMaybeHexChainId('1')).toBe('0x1');
    });

    it('returns the hex chain ID unchanged when already a hex string', () => {
      expect(getMaybeHexChainId('0x1')).toBe('0x1');
    });
  });
});
