import { MarketCategory } from '@metamask/perps-controller';
import { renderHook } from '@testing-library/react-hooks';
import { usePerpsCategories } from './usePerpsCategories';
import { usePerpsMarkets } from './usePerpsMarkets';

jest.mock('./usePerpsMarkets');
jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const mockUsePerpsMarkets = usePerpsMarkets as jest.MockedFunction<
  typeof usePerpsMarkets
>;

interface MockMarket {
  isHip3: boolean;
  marketType?: string;
}

function mockMarkets(markets: MockMarket[]) {
  mockUsePerpsMarkets.mockReturnValue({
    markets,
  } as unknown as ReturnType<typeof usePerpsMarkets>);
}

describe('usePerpsCategories', () => {
  it('returns empty array when no markets exist', () => {
    mockMarkets([]);

    const { result } = renderHook(() => usePerpsCategories());

    expect(result.current).toEqual([]);
  });

  it('buckets non-HIP-3 markets under crypto', () => {
    mockMarkets([{ isHip3: false }]);

    const { result } = renderHook(() => usePerpsCategories());

    expect(result.current).toEqual([
      { id: 'crypto', label: 'perps.home.tabs.crypto' },
    ]);
  });

  it('maps HIP-3 markets to their MarketTypeFilter id', () => {
    mockMarkets([{ isHip3: true, marketType: MarketCategory.Stock }]);

    const { result } = renderHook(() => usePerpsCategories());

    expect(result.current).toEqual([
      { id: 'stocks', label: 'perps.home.tabs.stocks' },
    ]);
  });

  it('deduplicates categories', () => {
    mockMarkets([
      { isHip3: false },
      { isHip3: false },
      { isHip3: true, marketType: MarketCategory.Forex },
      { isHip3: true, marketType: MarketCategory.Forex },
    ]);

    const { result } = renderHook(() => usePerpsCategories());

    const ids = result.current.map((c) => c.id);
    expect(ids).toEqual(['crypto', 'forex']);
  });

  it('skips HIP-3 markets with unknown marketType', () => {
    mockMarkets([
      { isHip3: true, marketType: 'unknown-type' },
      { isHip3: false },
    ]);

    const { result } = renderHook(() => usePerpsCategories());

    expect(result.current).toEqual([
      { id: 'crypto', label: 'perps.home.tabs.crypto' },
    ]);
  });

  it('skips HIP-3 markets with undefined marketType', () => {
    mockMarkets([{ isHip3: true, marketType: undefined }]);

    const { result } = renderHook(() => usePerpsCategories());

    expect(result.current).toEqual([]);
  });

  describe('display order', () => {
    it('sorts categories according to CATEGORY_DISPLAY_ORDER', () => {
      mockMarkets([
        { isHip3: true, marketType: MarketCategory.Etf },
        { isHip3: true, marketType: MarketCategory.Forex },
        { isHip3: false },
        { isHip3: true, marketType: MarketCategory.Stock },
      ]);

      const { result } = renderHook(() => usePerpsCategories());

      const ids = result.current.map((c) => c.id);
      expect(ids).toEqual(['crypto', 'stocks', 'forex', 'etfs']);
    });

    it('places all known categories in the correct order', () => {
      mockMarkets([
        { isHip3: true, marketType: MarketCategory.Etf },
        { isHip3: true, marketType: MarketCategory.Index },
        { isHip3: true, marketType: MarketCategory.Commodity },
        { isHip3: true, marketType: MarketCategory.Forex },
        { isHip3: true, marketType: MarketCategory.PreIpo },
        { isHip3: true, marketType: MarketCategory.Stock },
        { isHip3: false },
      ]);

      const { result } = renderHook(() => usePerpsCategories());

      const ids = result.current.map((c) => c.id);
      expect(ids).toEqual([
        'crypto',
        'stocks',
        'pre-ipo',
        'forex',
        'commodities',
        'indices',
        'etfs',
      ]);
    });
  });

  it('normalises hyphenated ids for translation keys', () => {
    mockMarkets([{ isHip3: true, marketType: MarketCategory.PreIpo }]);

    const { result } = renderHook(() => usePerpsCategories());

    expect(result.current[0].label).toBe('perps.home.tabs.pre_ipo');
  });
});
