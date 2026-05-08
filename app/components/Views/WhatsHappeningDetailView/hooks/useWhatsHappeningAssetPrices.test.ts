import { renderHook } from '@testing-library/react-native';
import { useWhatsHappeningAssetPrices } from './useWhatsHappeningAssetPrices';
import type { WhatsHappeningItem } from '../../Homepage/Sections/WhatsHappening/types';
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

const makeItem = (relatedAssets: RelatedAsset[]): WhatsHappeningItem => ({
  id: 'trend-0',
  title: 'Test',
  description: 'Test description',
  date: '2026-01-01T00:00:00.000Z',
  impact: 'positive',
  relatedAssets,
  articles: [],
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('useWhatsHappeningAssetPrices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePerpsLivePrices.mockReturnValue({});
  });

  describe('perps live price subscription', () => {
    it('returns empty perpsPriceBySymbol when there are no hlPerpsMarket entries', () => {
      const item = makeItem([assetNoPerps]);
      const { result } = renderHook(() => useWhatsHappeningAssetPrices(item));
      expect(result.current.perpsPriceBySymbol).toEqual({});
    });

    it('passes symbols to usePerpsLivePrices without duplicates', () => {
      const item = makeItem([
        tslaAsset,
        { ...tslaAsset, sourceAssetId: 'tsla2' },
      ]);
      renderHook(() => useWhatsHappeningAssetPrices(item));
      expect(mockUsePerpsLivePrices).toHaveBeenCalledWith({
        symbols: ['xyz:TSLA'],
        throttleMs: 3000,
      });
    });

    it('populates perpsPriceBySymbol from live prices', () => {
      mockUsePerpsLivePrices.mockReturnValue({
        'xyz:TSLA': { price: '172.50', percentChange24h: '3.45' },
      });
      const item = makeItem([tslaAsset]);
      const { result } = renderHook(() => useWhatsHappeningAssetPrices(item));
      expect(result.current.perpsPriceBySymbol['xyz:TSLA']).toEqual({
        price: 172.5,
        percentChange24h: 3.45,
      });
    });

    it('handles missing percentChange24h gracefully', () => {
      mockUsePerpsLivePrices.mockReturnValue({
        'xyz:TSLA': { price: '172.50' },
      });
      const item = makeItem([tslaAsset]);
      const { result } = renderHook(() => useWhatsHappeningAssetPrices(item));
      expect(result.current.perpsPriceBySymbol['xyz:TSLA']).toMatchObject({
        price: 172.5,
        percentChange24h: undefined,
      });
    });

    it('handles assets that have both caip19 and hlPerpsMarket', () => {
      mockUsePerpsLivePrices.mockReturnValue({
        BTC: { price: '95000', percentChange24h: '2.5' },
      });
      const item = makeItem([btcPerpsAsset]);
      const { result } = renderHook(() => useWhatsHappeningAssetPrices(item));
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
      const item = makeItem([tslaAsset, ethAsset]);
      renderHook(() => useWhatsHappeningAssetPrices(item));
      expect(mockUsePerpsLivePrices).toHaveBeenCalledWith(
        expect.objectContaining({
          symbols: expect.arrayContaining(['xyz:TSLA', 'ETH']),
        }),
      );
    });
  });

  it('does not include token-only assets (no hlPerpsMarket) in the symbols list', () => {
    const item = makeItem([assetNoPerps]);
    renderHook(() => useWhatsHappeningAssetPrices(item));
    expect(mockUsePerpsLivePrices).toHaveBeenCalledWith({
      symbols: [],
      throttleMs: 3000,
    });
  });
});
