import { useHasNewMarkets } from './useHasNewMarkets';
import { usePerpsMarkets } from './usePerpsMarkets';
import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { selectPerpsTerminalBackendEnabledFlag } from '../selectors/featureFlags';

jest.mock('./usePerpsMarkets');
jest.mock('react-redux');

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
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const NOW = 1_700_000_000_000; // fixed epoch ms for determinism
const RECENT_LISTED_AT = NOW - 5 * ONE_DAY_MS;
const OLD_LISTED_AT = NOW - 45 * ONE_DAY_MS;

function mockMarkets(markets: { listedAt?: number }[]) {
  mockUsePerpsMarkets.mockReturnValue({
    markets,
  } as unknown as ReturnType<typeof usePerpsMarkets>);
}

function mockTerminalBackendEnabled(enabled: boolean) {
  mockUseSelector.mockImplementation((selector: unknown) => {
    if (selector === selectPerpsTerminalBackendEnabledFlag) return enabled;
    return undefined;
  });
}

describe('useHasNewMarkets', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
    // Terminal backend enabled by default so existing listedAt-driven cases
    // exercise the "data present" path; flag-off behavior is covered below.
    mockTerminalBackendEnabled(true);
    // `restoreAllMocks` (global afterEach) doesn't clear call history on this
    // jest.mock factory's `jest.fn()`, so without this, `.mock.calls[0][0]`
    // below would read a stale callback from a previous test's unmounted hook.
    useFocusEffect.mockClear();
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

  describe('Terminal backend gating', () => {
    it('returns false when the Terminal backend flag is off, even with a recently listed market', () => {
      mockTerminalBackendEnabled(false);
      mockMarkets([{ listedAt: RECENT_LISTED_AT }]);

      const { result } = renderHook(() => useHasNewMarkets());

      expect(result.current).toBe(false);
    });

    it('returns true when the Terminal backend flag is on and a market qualifies', () => {
      mockTerminalBackendEnabled(true);
      mockMarkets([{ listedAt: RECENT_LISTED_AT }]);

      const { result } = renderHook(() => useHasNewMarkets());

      expect(result.current).toBe(true);
    });

    it('returns false when the Terminal backend flag is off and there is no listedAt data', () => {
      mockTerminalBackendEnabled(false);
      mockMarkets([{ listedAt: undefined }]);

      const { result } = renderHook(() => useHasNewMarkets());

      expect(result.current).toBe(false);
    });
  });
});
