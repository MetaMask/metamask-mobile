import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import {
  selectConversionRateBySymbol,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { useUsdToFiatRate } from './useUsdToFiatRate';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../selectors/currencyRateController', () => ({
  selectConversionRateBySymbol: jest.fn(),
  selectCurrentCurrency: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockSelectConversionRateBySymbol = jest.mocked(
  selectConversionRateBySymbol,
);
const mockSelectCurrentCurrency = jest.mocked(selectCurrentCurrency);

describe('useUsdToFiatRate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectCurrentCurrency) {
        return mockSelectCurrentCurrency({} as never);
      }
      return selector({} as never);
    });
    mockSelectCurrentCurrency.mockReturnValue('USD');
    mockSelectConversionRateBySymbol.mockReturnValue(0);
  });

  it('returns a rate of one for USD', () => {
    mockSelectCurrentCurrency.mockReturnValue('usd');

    const { result } = renderHook(() => useUsdToFiatRate());

    expect(result.current).toEqual({ currency: 'USD', rate: 1 });
  });

  it('returns the USD-to-EUR rate when EUR is selected', () => {
    mockSelectCurrentCurrency.mockReturnValue('eur');
    mockSelectConversionRateBySymbol.mockReturnValue(0.92);

    const { result } = renderHook(() => useUsdToFiatRate());

    expect(result.current).toEqual({ currency: 'EUR', rate: 0.92 });
    expect(mockSelectConversionRateBySymbol).toHaveBeenCalledWith(
      expect.anything(),
      'usd',
    );
  });

  it('treats a missing EUR rate as undefined', () => {
    mockSelectCurrentCurrency.mockReturnValue('EUR');
    mockSelectConversionRateBySymbol.mockReturnValue(0);

    const { result } = renderHook(() => useUsdToFiatRate());

    expect(result.current).toEqual({ currency: 'EUR', rate: undefined });
  });
});
