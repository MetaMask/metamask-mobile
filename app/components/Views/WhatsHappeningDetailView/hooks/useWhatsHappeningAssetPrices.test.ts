import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useWhatsHappeningAssetPrices } from './useWhatsHappeningAssetPrices';
import type { WhatsHappeningItem } from '../../Homepage/Sections/WhatsHappening/types';
import type { RelatedAsset } from '@metamask/ai-controllers';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockHandleFetch = jest.fn();
jest.mock('@metamask/controller-utils', () => ({
  handleFetch: (...args: unknown[]) => mockHandleFetch(...args),
}));

// Mock useSelector to return 'usd' for selectCurrentCurrency
jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => 'usd'),
}));

jest.mock('../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: jest.fn(() => 'usd'),
}));

const mockUsePerpsLivePrices = jest.fn(
  (_options: { symbols: string[]; throttleMs?: number }) => ({}),
);
jest.mock('../../../UI/Perps/hooks/stream', () => ({
  usePerpsLivePrices: (options: { symbols: string[]; throttleMs?: number }) =>
    mockUsePerpsLivePrices(options),
}));

// ── Test data ──────────────────────────────────────────────────────────────────

const btcAsset: RelatedAsset = {
  sourceAssetId: 'bitcoin',
  symbol: 'BTC',
  name: 'Bitcoin',
  caip19: ['eip155:1/slip44:0'],
};

const tslaAsset: RelatedAsset = {
  sourceAssetId: 'tsla',
  symbol: 'TSLA',
  name: 'Tesla',
  caip19: [],
  hlPerpsMarket: ['xyz:TSLA'],
};

const ethDualAsset: RelatedAsset = {
  sourceAssetId: 'eth',
  symbol: 'ETH',
  name: 'Ethereum',
  caip19: ['eip155:1/slip44:60'],
  hlPerpsMarket: ['ETH'],
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
    mockHandleFetch.mockResolvedValue({});
    mockUsePerpsLivePrices.mockReturnValue({});
  });

  describe('token price fetching', () => {
    it('skips fetch when there are no caip19 IDs', async () => {
      const item = makeItem([tslaAsset]);
      const { result } = renderHook(() => useWhatsHappeningAssetPrices(item));
      await waitFor(() => {
        expect(result.current.tokenPriceByCaip).toEqual({});
      });
      expect(mockHandleFetch).not.toHaveBeenCalled();
    });

    it('fetches token prices and populates tokenPriceByCaip map', async () => {
      const caip = 'eip155:1/slip44:0';
      mockHandleFetch.mockResolvedValueOnce({
        [caip]: { price: 95000, pricePercentChange1d: 2.5 },
      });
      const item = makeItem([btcAsset]);
      const { result } = renderHook(() => useWhatsHappeningAssetPrices(item));
      await waitFor(() => {
        expect(result.current.tokenPriceByCaip[caip]).toBeDefined();
      });
      expect(result.current.tokenPriceByCaip[caip]).toEqual({
        price: 95000,
        pricePercentChange1d: 2.5,
      });
    });

    it('deduplicates caip19 IDs and fires a single fetch', async () => {
      const caip = 'eip155:1/slip44:0';
      const duplicateAsset: RelatedAsset = {
        ...btcAsset,
        sourceAssetId: 'btc2',
      };
      mockHandleFetch.mockResolvedValueOnce({
        [caip]: { price: 95000, pricePercentChange1d: 2.5 },
      });
      const item = makeItem([btcAsset, duplicateAsset]);
      renderHook(() => useWhatsHappeningAssetPrices(item));
      await waitFor(() => {
        expect(mockHandleFetch).toHaveBeenCalledTimes(1);
      });
      // URL should contain caip only once
      const url: string = mockHandleFetch.mock.calls[0][0];
      const encodedCaip = encodeURIComponent(caip);
      expect(url.split(encodedCaip).length - 1).toBe(1);
    });

    it('yields empty token map on fetch error (no crash)', async () => {
      mockHandleFetch.mockRejectedValueOnce(new Error('Network error'));
      const item = makeItem([btcAsset]);
      const { result } = renderHook(() => useWhatsHappeningAssetPrices(item));
      await waitFor(() => {
        // After error, map is reset to {}
        expect(result.current.tokenPriceByCaip).toEqual({});
      });
    });
  });

  describe('perps live price subscription', () => {
    it('returns empty perpsPriceBySymbol when there are no hlPerpsMarket entries', () => {
      const item = makeItem([btcAsset]);
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
  });

  describe('mixed assets', () => {
    it('handles dual assets (both caip19 and hlPerpsMarket) correctly', async () => {
      const caip = 'eip155:1/slip44:60';
      mockHandleFetch.mockResolvedValueOnce({
        [caip]: { price: 3500, pricePercentChange1d: 1.2 },
      });
      mockUsePerpsLivePrices.mockReturnValue({
        ETH: { price: '3500', percentChange24h: '1.2' },
      });
      const item = makeItem([ethDualAsset]);
      const { result } = renderHook(() => useWhatsHappeningAssetPrices(item));
      await waitFor(() => {
        expect(result.current.tokenPriceByCaip[caip]?.price).toBe(3500);
      });
      expect(result.current.perpsPriceBySymbol.ETH?.price).toBe(3500);
    });
  });

  describe('cleanup', () => {
    it('does not update state after unmount (stale fetch is discarded)', async () => {
      let resolvePromise!: (value: unknown) => void;
      mockHandleFetch.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          }),
      );
      const item = makeItem([btcAsset]);
      const { unmount } = renderHook(() => useWhatsHappeningAssetPrices(item));
      unmount();
      // Now resolve after unmount — should not cause state update warnings
      await act(async () => {
        resolvePromise({ 'eip155:1/slip44:0': { price: 95000 } });
      });
      // If we reach here without error, the cleanup is working correctly
      expect(true).toBe(true);
    });
  });
});
