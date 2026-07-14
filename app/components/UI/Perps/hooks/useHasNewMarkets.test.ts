import { useHasNewMarkets } from './useHasNewMarkets';
import { usePerpsMarkets } from './usePerpsMarkets';
import { renderHook } from '@testing-library/react-hooks';

jest.mock('./usePerpsMarkets');

const mockUsePerpsMarkets = usePerpsMarkets as jest.MockedFunction<
  typeof usePerpsMarkets
>;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const NOW = 1_700_000_000_000; // fixed epoch ms for determinism
const RECENT_LISTED_AT = NOW - 5 * ONE_DAY_MS;
const OLD_LISTED_AT = NOW - 45 * ONE_DAY_MS;

function mockMarkets(markets: { listedAt?: number }[]) {
  mockUsePerpsMarkets.mockReturnValue({
    markets,
  } as unknown as ReturnType<typeof usePerpsMarkets>);
}

describe('useHasNewMarkets', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns true when at least one market was listed within the last 30 days', () => {
    mockMarkets([{ listedAt: OLD_LISTED_AT }, { listedAt: RECENT_LISTED_AT }]);

    const { result } = renderHook(() => useHasNewMarkets());

    expect(result.current).toBe(true);
  });

  it('returns false when no markets were listed within the last 30 days', () => {
    mockMarkets([{ listedAt: OLD_LISTED_AT }, { listedAt: undefined }]);

    const { result } = renderHook(() => useHasNewMarkets());

    expect(result.current).toBe(false);
  });

  it('returns false when the markets list is empty', () => {
    mockMarkets([]);

    const { result } = renderHook(() => useHasNewMarkets());

    expect(result.current).toBe(false);
  });

  it('returns true when all markets were listed within the last 30 days', () => {
    mockMarkets([
      { listedAt: RECENT_LISTED_AT },
      { listedAt: RECENT_LISTED_AT },
    ]);

    const { result } = renderHook(() => useHasNewMarkets());

    expect(result.current).toBe(true);
  });

  it('returns false when listedAt is undefined for all markets', () => {
    mockMarkets([{ listedAt: undefined }, { listedAt: undefined }]);

    const { result } = renderHook(() => useHasNewMarkets());

    expect(result.current).toBe(false);
  });
});
