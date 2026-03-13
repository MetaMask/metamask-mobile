import { renderHook } from '@testing-library/react-hooks';
import { BigNumber } from 'bignumber.js';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import useFiatFormatter from './useFiatFormatter';
import formatFiat from '../../../../util/formatFiat';

jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector) => selector()),
}));

jest.mock('../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: jest.fn(),
}));

jest.mock('../../../../util/formatFiat', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockSelectCurrentCurrency = selectCurrentCurrency as unknown as jest.Mock;
const mockFormatFiat = formatFiat as unknown as jest.Mock;

describe('useFiatFormatter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a function that calls formatFiat with the current currency from Redux', () => {
    mockSelectCurrentCurrency.mockReturnValue('USD');
    mockFormatFiat.mockReturnValue('$1,000');

    const { result } = renderHook(() => useFiatFormatter());
    const formatter = result.current;

    const amount = new BigNumber(1000);
    const formattedResult = formatter(amount);

    expect(selectCurrentCurrency).toHaveBeenCalledTimes(1);
    expect(formatFiat).toHaveBeenCalledWith(amount, 'USD');
    expect(formattedResult).toBe('$1,000');
  });

  it('uses the currency from Redux when no override is provided', () => {
    mockSelectCurrentCurrency.mockReturnValue('EUR');
    mockFormatFiat.mockReturnValue('€500');

    const { result } = renderHook(() => useFiatFormatter());
    const formatter = result.current;

    const amount = new BigNumber(500);
    formatter(amount);

    expect(selectCurrentCurrency).toHaveBeenCalledTimes(1);
    expect(formatFiat).toHaveBeenCalledWith(amount, 'EUR');
  });

  it('overrides the currency from Redux when currency parameter is provided', () => {
    mockSelectCurrentCurrency.mockReturnValue('USD');
    mockFormatFiat.mockReturnValue('£1,000');

    const { result } = renderHook(() => useFiatFormatter({ currency: 'GBP' }));
    const formatter = result.current;

    const amount = new BigNumber(1000);
    formatter(amount);

    expect(selectCurrentCurrency).toHaveBeenCalledTimes(1);
    expect(formatFiat).toHaveBeenCalledWith(amount, 'GBP');
  });

  it('passes the correct currency to formatFiat for each call', () => {
    mockSelectCurrentCurrency.mockReturnValue('JPY');
    mockFormatFiat.mockImplementation(
      (amount, currency) => `${amount.toString()} ${currency}`,
    );

    const { result } = renderHook(() => useFiatFormatter());
    const formatter = result.current;

    formatter(new BigNumber(100));
    formatter(new BigNumber(200));

    expect(formatFiat).toHaveBeenCalledTimes(2);
    expect(formatFiat).toHaveBeenNthCalledWith(1, new BigNumber(100), 'JPY');
    expect(formatFiat).toHaveBeenNthCalledWith(2, new BigNumber(200), 'JPY');
  });
});
