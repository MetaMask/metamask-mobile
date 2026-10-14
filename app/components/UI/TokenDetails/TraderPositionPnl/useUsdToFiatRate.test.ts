import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { useUsdToFiatRate } from './useUsdToFiatRate';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../selectors/currencyRateController', () => ({
  selectCurrencyRates: jest.fn(),
  selectCurrentCurrency: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockSelectCurrencyRates = jest.mocked(selectCurrencyRates);
const mockSelectCurrentCurrency = jest.mocked(selectCurrentCurrency);

describe('useUsdToFiatRate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectCurrentCurrency) {
        return mockSelectCurrentCurrency({} as never);
      }
      if (selector === selectCurrencyRates) {
        return mockSelectCurrencyRates({} as never);
      }
      return selector({} as never);
    });
    mockSelectCurrentCurrency.mockReturnValue('USD');
    mockSelectCurrencyRates.mockReturnValue({});
  });

  it('returns a rate of one for USD', () => {
    mockSelectCurrentCurrency.mockReturnValue('usd');

    const { result } = renderHook(() => useUsdToFiatRate());

    expect(result.current).toEqual({ currency: 'USD', rate: 1 });
  });

  it('returns the USD-to-EUR rate when EUR is selected', () => {
    mockSelectCurrentCurrency.mockReturnValue('eur');
    mockSelectCurrencyRates.mockReturnValue({
      ETH: {
        conversionDate: null,
        conversionRate: 2300,
        usdConversionRate: 2500,
      },
    });

    const { result } = renderHook(() => useUsdToFiatRate());

    expect(result.current).toEqual({ currency: 'EUR', rate: 0.92 });
  });

  it('treats a missing EUR rate as undefined', () => {
    mockSelectCurrentCurrency.mockReturnValue('EUR');
    mockSelectCurrencyRates.mockReturnValue({
      ETH: {
        conversionDate: null,
        conversionRate: 0,
        usdConversionRate: 2500,
      },
    });

    const { result } = renderHook(() => useUsdToFiatRate());

    expect(result.current).toEqual({ currency: 'EUR', rate: undefined });
  });
});
