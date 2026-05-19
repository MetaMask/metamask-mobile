import { renderHook } from '@testing-library/react-native';
import { useWhatsHappeningAssetPrices } from './useWhatsHappeningAssetPrices';
import type { RelatedAsset } from '@metamask/ai-controllers';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockUsePerpsLivePrices = jest.fn(
  (_options: { symbols: string[]; throttleMs?: number }) => ({}),
);
jest.mock('../../../UI/Perps/hooks/stream', () => ({
  usePerpsLivePrices: (options: { symbols: string[]; throttleMs?: number }) =>
    mockUsePerpsLivePrices(options),
}));

// ── Test data ──────────────────────────────────────────────────────────────────

const tslaAsset: RelatedAsset = {
  sourceAssetId: 'tsla',
  symbol: 'TSLA',
  name: 'Tesla',
  caip19: [],
  hlPerpsMarket: ['xyz:TSLA'],
};

const btcPerpsAsset: RelatedAsset = {
  sourceAssetId: 'bitcoin',
  symbol: 'BTC',
  name: 'Bitcoin',
  caip19: ['eip155:1/slip44:0'],
  hlPerpsMarket: ['BTC'],
};

const assetNoPerps: RelatedAsset = {
  sourceAssetId: 'no-perps',
  symbol: 'FOO',
  name: 'Foo',
  caip19: ['eip155:1/erc20:0xfoo'],
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('useWhatsHappeningAssetPrices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePerpsLivePrices.mockReturnValue({});
  });

  describe('perps live price subscription', () => {
    it('returns empty perpsPriceBySymbol when there are no hlPerpsMarket entries', () => {
      const { result } = renderHook(() =>
        useWhatsHappeningAssetPrices([assetNoPerps]),
      );
      expect(result.current.perpsPriceBySymbol).toEqual({});
    });

    it('passes symbols to usePerpsLivePrices without duplicates', () => {
      renderHook(() =>
        useWhatsHappeningAssetPrices([
          tslaAsset,
          { ...tslaAsset, sourceAssetId: 'tsla2' },
        ]),
      );
      expect(mockUsePerpsLivePrices).toHaveBeenCalledWith({
        symbols: ['xyz:TSLA'],
        throttleMs: 3000,
      });
    });

    it('populates perpsPriceBySymbol from live prices', () => {
      mockUsePerpsLivePrices.mockReturnValue({
        'xyz:TSLA': { price: '172.50', percentChange24h: '3.45' },
      });
      const { result } = renderHook(() =>
        useWhatsHappeningAssetPrices([tslaAsset]),
      );
      expect(result.current.perpsPriceBySymbol['xyz:TSLA']).toEqual({
        price: 172.5,
        percentChange24h: 3.45,
      });
    });

    it('handles missing percentChange24h gracefully', () => {
      mockUsePerpsLivePrices.mockReturnValue({
        'xyz:TSLA': { price: '172.50' },
      });
      const { result } = renderHook(() =>
        useWhatsHappeningAssetPrices([tslaAsset]),
      );
      expect(result.current.perpsPriceBySymbol['xyz:TSLA']).toMatchObject({
        price: 172.5,
        percentChange24h: undefined,
      });
    });

    it('handles assets that have both caip19 and hlPerpsMarket', () => {
      mockUsePerpsLivePrices.mockReturnValue({
        BTC: { price: '95000', percentChange24h: '2.5' },
      });
      const { result } = renderHook(() =>
        useWhatsHappeningAssetPrices([btcPerpsAsset]),
      );
      expect(mockUsePerpsLivePrices).toHaveBeenCalledWith({
        symbols: ['BTC'],
        throttleMs: 3000,
      });
      expect(result.current.perpsPriceBySymbol.BTC?.price).toBe(95000);
    });

    it('includes symbols from multiple assets deduplicating repeated markets', () => {
      const ethAsset: RelatedAsset = {
        sourceAssetId: 'eth',
        symbol: 'ETH',
        name: 'Ethereum',
        hlPerpsMarket: ['ETH'],
      };
      renderHook(() => useWhatsHappeningAssetPrices([tslaAsset, ethAsset]));
      expect(mockUsePerpsLivePrices).toHaveBeenCalledWith(
        expect.objectContaining({
          symbols: expect.arrayContaining(['xyz:TSLA', 'ETH']),
        }),
      );
    });
  });

  it('does not include token-only assets (no hlPerpsMarket) in the symbols list', () => {
    renderHook(() => useWhatsHappeningAssetPrices([assetNoPerps]));
    expect(mockUsePerpsLivePrices).toHaveBeenCalledWith({
      symbols: [],
      throttleMs: 3000,
    });
  });
});
