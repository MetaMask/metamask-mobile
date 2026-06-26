import { useHasNewMarkets } from './useHasNewMarkets';
import { usePerpsMarkets } from './usePerpsMarkets';
import { renderHook } from '@testing-library/react-hooks';

jest.mock('./usePerpsMarkets');

const mockUsePerpsMarkets = usePerpsMarkets as jest.MockedFunction<
  typeof usePerpsMarkets
>;

function mockMarkets(markets: { isNewMarket: boolean }[]) {
  mockUsePerpsMarkets.mockReturnValue({
    markets,
  } as unknown as ReturnType<typeof usePerpsMarkets>);
}

describe('useHasNewMarkets', () => {
  it('returns true when at least one market has isNewMarket set', () => {
    mockMarkets([{ isNewMarket: false }, { isNewMarket: true }]);

    const { result } = renderHook(() => useHasNewMarkets());

    expect(result.current).toBe(true);
  });

  it('returns false when no markets have isNewMarket set', () => {
    mockMarkets([{ isNewMarket: false }, { isNewMarket: false }]);

    const { result } = renderHook(() => useHasNewMarkets());

    expect(result.current).toBe(false);
  });

  it('returns false when the markets list is empty', () => {
    mockMarkets([]);

    const { result } = renderHook(() => useHasNewMarkets());

    expect(result.current).toBe(false);
  });

  it('returns true when all markets are new', () => {
    mockMarkets([{ isNewMarket: true }, { isNewMarket: true }]);

    const { result } = renderHook(() => useHasNewMarkets());

    expect(result.current).toBe(true);
  });
});
