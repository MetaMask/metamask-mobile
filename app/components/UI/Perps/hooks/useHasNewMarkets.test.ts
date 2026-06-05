import { useHasNewMarkets } from './useHasNewMarkets';
import { usePerpsMarkets } from './usePerpsMarkets';
import { renderHook } from '@testing-library/react-hooks';

jest.mock('./usePerpsMarkets');

const mockUsePerpsMarkets = usePerpsMarkets as jest.MockedFunction<
  typeof usePerpsMarkets
>;

describe('useHasNewMarkets', () => {
  it('returns true when at least one market has isNewMarket set', () => {
    mockUsePerpsMarkets.mockReturnValue({
      markets: [{ isNewMarket: false }, { isNewMarket: true }],
    } as ReturnType<typeof usePerpsMarkets>);

    const { result } = renderHook(() => useHasNewMarkets());

    expect(result.current).toBe(true);
  });

  it('returns false when no markets have isNewMarket set', () => {
    mockUsePerpsMarkets.mockReturnValue({
      markets: [{ isNewMarket: false }, { isNewMarket: false }],
    } as ReturnType<typeof usePerpsMarkets>);

    const { result } = renderHook(() => useHasNewMarkets());

    expect(result.current).toBe(false);
  });

  it('returns false when the markets list is empty', () => {
    mockUsePerpsMarkets.mockReturnValue({
      markets: [],
    } as ReturnType<typeof usePerpsMarkets>);

    const { result } = renderHook(() => useHasNewMarkets());

    expect(result.current).toBe(false);
  });

  it('returns true when all markets are new', () => {
    mockUsePerpsMarkets.mockReturnValue({
      markets: [{ isNewMarket: true }, { isNewMarket: true }],
    } as ReturnType<typeof usePerpsMarkets>);

    const { result } = renderHook(() => useHasNewMarkets());

    expect(result.current).toBe(true);
  });
});
