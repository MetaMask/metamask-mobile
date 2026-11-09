import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { usePerpsMarketHeaderInsets } from './usePerpsMarketHeaderInsets';
import { PERPS_MARKET_HEADER_HEIGHT } from './PerpsMarketHeader.types';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);
const edgeInsets = { top: 47, bottom: 34 };

describe('usePerpsMarketHeaderInsets', () => {
  beforeEach(() => {
    mockUseSelector.mockReturnValue(true);
  });

  it('pads the status bar and covers it plus the header height', () => {
    const { result } = renderHook(() =>
      usePerpsMarketHeaderInsets(edgeInsets, false),
    );

    expect(result.current).toEqual({
      headerTopInset: 47,
      headerInset: 47 + PERPS_MARKET_HEADER_HEIGHT,
    });
  });

  it('leaves the status bar to the service banner when it is shown', () => {
    const { result } = renderHook(() =>
      usePerpsMarketHeaderInsets(edgeInsets, true),
    );

    expect(result.current).toEqual({
      headerTopInset: 0,
      headerInset: PERPS_MARKET_HEADER_HEIGHT,
    });
  });

  it('covers no content when the brand refresh is off', () => {
    mockUseSelector.mockReturnValue(false);

    const { result } = renderHook(() =>
      usePerpsMarketHeaderInsets(edgeInsets, false),
    );

    expect(result.current.headerInset).toBe(0);
  });

  it('treats missing edge insets as no status bar padding', () => {
    const { result } = renderHook(() =>
      usePerpsMarketHeaderInsets(undefined, false),
    );

    expect(result.current).toEqual({
      headerTopInset: 0,
      headerInset: PERPS_MARKET_HEADER_HEIGHT,
    });
  });
});
