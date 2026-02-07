import { getAssetName, PERPS_ASSET_NAMES } from './assetNames';

describe('assetNames', () => {
  describe('PERPS_ASSET_NAMES', () => {
    it('contains major cryptocurrencies', () => {
      expect(PERPS_ASSET_NAMES.BTC).toBe('Bitcoin');
      expect(PERPS_ASSET_NAMES.ETH).toBe('Ethereum');
      expect(PERPS_ASSET_NAMES.SOL).toBe('Solana');
    });

    it('contains stock symbols', () => {
      expect(PERPS_ASSET_NAMES.TSLA).toBe('Tesla');
      expect(PERPS_ASSET_NAMES.NVDA).toBe('NVIDIA');
      expect(PERPS_ASSET_NAMES.AAPL).toBe('Apple');
    });

    it('contains commodity symbols', () => {
      expect(PERPS_ASSET_NAMES.GOLD).toBe('Gold');
      expect(PERPS_ASSET_NAMES.SILVER).toBe('Silver');
    });
  });

  describe('getAssetName', () => {
    describe('regular crypto symbols', () => {
      it('returns Bitcoin for BTC', () => {
        expect(getAssetName('BTC')).toBe('Bitcoin');
      });

      it('returns Ethereum for ETH', () => {
        expect(getAssetName('ETH')).toBe('Ethereum');
      });

      it('returns Solana for SOL', () => {
        expect(getAssetName('SOL')).toBe('Solana');
      });

      it('returns Avalanche for AVAX', () => {
        expect(getAssetName('AVAX')).toBe('Avalanche');
      });
    });

    describe('HIP-3 prefixed symbols', () => {
      it('strips xyz prefix and returns Tesla for xyz:TSLA', () => {
        expect(getAssetName('xyz:TSLA')).toBe('Tesla');
      });

      it('strips xyz prefix and returns NVIDIA for xyz:NVDA', () => {
        expect(getAssetName('xyz:NVDA')).toBe('NVIDIA');
      });

      it('strips abc prefix and returns Apple for abc:AAPL', () => {
        expect(getAssetName('abc:AAPL')).toBe('Apple');
      });

      it('strips prefix for commodity assets', () => {
        expect(getAssetName('xyz:GOLD')).toBe('Gold');
      });
    });

    describe('unknown symbols', () => {
      it('returns the symbol itself for unknown symbols', () => {
        expect(getAssetName('UNKNOWNTOKEN')).toBe('UNKNOWNTOKEN');
      });

      it('returns the base symbol for unknown HIP-3 prefixed symbols', () => {
        expect(getAssetName('xyz:UNKNOWNSTOCK')).toBe('UNKNOWNSTOCK');
      });
    });

    describe('edge cases', () => {
      it('returns empty string for empty input', () => {
        expect(getAssetName('')).toBe('');
      });

      it('returns null for null input', () => {
        expect(getAssetName(null as unknown as string)).toBe(null);
      });

      it('returns undefined for undefined input', () => {
        expect(getAssetName(undefined as unknown as string)).toBe(undefined);
      });

      it('handles symbol with colon at start', () => {
        expect(getAssetName(':BTC')).toBe(':BTC');
      });

      it('handles symbol with colon at end', () => {
        expect(getAssetName('xyz:')).toBe('');
      });

      it('handles multiple colons by using first occurrence', () => {
        expect(getAssetName('a:b:c')).toBe('b:c');
      });
    });
  });
});
