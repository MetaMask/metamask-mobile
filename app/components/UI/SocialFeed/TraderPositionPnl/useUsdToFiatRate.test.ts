import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import {
  selectCurrentCurrency,
  selectUsdToFiatRate,
} from '../../../../selectors/currencyRateController';
import { useUsdToFiatRate } from './useUsdToFiatRate';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

describe('useUsdToFiatRate', () => {
  beforeEach(() => {
    mockUseSelector.mockReset();
  });

  it('returns rate 1 when USD is selected', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectCurrentCurrency) return 'USD';
      if (selector === selectUsdToFiatRate) return 1;
      return undefined;
    });

    const { result } = renderHook(() => useUsdToFiatRate());

    expect(result.current).toEqual({ currency: 'usd', rate: 1 });
  });

  it('returns the EUR rate when one is available', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectCurrentCurrency) return 'eur';
      if (selector === selectUsdToFiatRate) return 0.91;
      return undefined;
    });

    const { result } = renderHook(() => useUsdToFiatRate());

    expect(result.current).toEqual({ currency: 'eur', rate: 0.91 });
  });

  it('treats a zero rate as missing', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectCurrentCurrency) return 'eur';
      if (selector === selectUsdToFiatRate) return 0;
      return undefined;
    });

    const { result } = renderHook(() => useUsdToFiatRate());

    expect(result.current).toEqual({ currency: 'eur', rate: null });
  });
});
