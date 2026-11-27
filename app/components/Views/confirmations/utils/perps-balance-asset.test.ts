import { LIGHTER_USDC_ASSET_ID } from '../temp-lighter/perps-lighter-transactions';
import {
  HYPERLIQUID_USDC_ASSET_ID,
  getPerpsBalanceAssetId,
  getPerpsBalanceProvider,
} from './perps-balance-asset';

describe('perps-balance-asset', () => {
  describe('getPerpsBalanceAssetId', () => {
    it.each([
      ['hyperliquid', HYPERLIQUID_USDC_ASSET_ID],
      ['lighter', LIGHTER_USDC_ASSET_ID],
    ] as const)('returns the asset id of %s', (provider, assetId) => {
      expect(getPerpsBalanceAssetId(provider)).toBe(assetId);
    });
  });

  describe('getPerpsBalanceProvider', () => {
    it.each([
      [HYPERLIQUID_USDC_ASSET_ID, 'hyperliquid'],
      [LIGHTER_USDC_ASSET_ID, 'lighter'],
    ])('returns the provider of %s', (assetId, provider) => {
      expect(getPerpsBalanceProvider(assetId)).toBe(provider);
    });

    it.each([
      undefined,
      'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    ])('returns undefined for %s', (assetId) => {
      expect(getPerpsBalanceProvider(assetId)).toBeUndefined();
    });
  });
});
