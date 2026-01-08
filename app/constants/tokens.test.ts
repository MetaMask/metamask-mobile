import { Hex } from '@metamask/utils';
import { ATOKEN_METADATA_FALLBACK, isAddressLikeOrMissing } from './tokens';

describe('tokens constants', () => {
  describe('ATOKEN_METADATA_FALLBACK', () => {
    it('contains mainnet chainId entry', () => {
      const mainnetEntry = ATOKEN_METADATA_FALLBACK['0x1' as Hex];

      expect(mainnetEntry).toBeDefined();
      expect(
        mainnetEntry['0xaa0200d169ff3ba9385c12e073c5d1d30434ae7b'],
      ).toEqual({
        name: 'Aave v3 MUSD',
        symbol: 'AMUSD',
        decimals: 6,
      });
    });

    it('contains Linea mainnet chainId entry', () => {
      const lineaEntry = ATOKEN_METADATA_FALLBACK['0xe708' as Hex];

      expect(lineaEntry).toBeDefined();
      expect(lineaEntry['0x61b19879f4033c2b5682a969cccc9141e022823c']).toEqual({
        name: 'Aave v3 MUSD',
        symbol: 'AMUSD',
        decimals: 6,
      });
    });
  });

  describe('isAddressLikeOrMissing', () => {
    it('returns true for string starting with 0x', () => {
      const result = isAddressLikeOrMissing(
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      );

      expect(result).toBe(true);
    });

    it('returns true for undefined', () => {
      const result = isAddressLikeOrMissing(undefined);

      expect(result).toBe(true);
    });

    it('returns true for empty string', () => {
      const result = isAddressLikeOrMissing('');

      expect(result).toBe(true);
    });

    it('returns false for normal string without 0x prefix', () => {
      const result = isAddressLikeOrMissing('USDC');

      expect(result).toBe(false);
    });

    it('returns false for token symbol', () => {
      const result = isAddressLikeOrMissing('aEthUSDC');

      expect(result).toBe(false);
    });

    it('returns true for short 0x string', () => {
      const result = isAddressLikeOrMissing('0x');

      expect(result).toBe(true);
    });
  });
});
