import { useHasNewMarkets } from './useHasNewMarkets';
import { usePerpsMarkets } from './usePerpsMarkets';
import { renderHook, act } from '@testing-library/react-hooks';

jest.mock('./usePerpsMarkets');

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports, import-x/no-commonjs
const { useFocusEffect } = require('@react-navigation/native') as {
  useFocusEffect: jest.Mock;
};

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

  it('flips to false when re-focused after the same markets age past 30 days', () => {
    // Regression test: the memo must take `now` as an explicit input (via
    // useNowOnScreenFocus) rather than reading Date.now() internally, so a
    // screen that stays mounted across the 30-day boundary re-evaluates on
    // focus instead of keeping a stale `true` for an unchanged `markets`
    // reference.
    const markets = [{ listedAt: RECENT_LISTED_AT }];
    mockMarkets(markets);

    const { result } = renderHook(() => useHasNewMarkets());

    expect(result.current).toBe(true);
    expect(mockUsePerpsMarkets).toHaveBeenCalled();

    // Advance time past the 30-day boundary without changing the markets
    // reference, then simulate the screen regaining focus.
    jest.spyOn(Date, 'now').mockReturnValue(NOW + 31 * ONE_DAY_MS);
    const focusCallback = useFocusEffect.mock.calls[0][0];
    act(() => {
      focusCallback();
    });

    expect(result.current).toBe(false);
  });
});
