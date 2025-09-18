import { renderHook } from '@testing-library/react-hooks';
import I18n from '../../../../../locales/i18n';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import useFiatFormatter from './useFiatFormatter';
import { BigNumber } from 'bignumber.js';

jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector) => selector()),
}));

jest.mock('../../../../../locales/i18n', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: jest.fn(),
}));

const mockI18n = I18n as unknown as jest.Mock;
const mockSelectCurrentCurrency = selectCurrentCurrency as unknown as jest.Mock;

describe('useFiatFormatter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a function that formats fiat amount correctly', () => {
    mockI18n.mockReturnValue({
      locale: 'en-US',
    });
    mockSelectCurrentCurrency.mockReturnValue('USD');

    const { result } = renderHook(() => useFiatFormatter());
    const formatFiat = result.current;

    expect(formatFiat(new BigNumber('987543219876543219876.54321'))).toBe(
      '$987,543,219,876,543,219,876.54',
    );
    expect(formatFiat(new BigNumber(1000))).toBe('$1,000');
    expect(formatFiat(new BigNumber(500.5))).toBe('$500.50');
    expect(formatFiat(new BigNumber(0))).toBe('$0');
    expect(formatFiat(new BigNumber(0.005))).toBe('<$0.01');
    expect(formatFiat(new BigNumber(0.0049))).toBe('<$0.01');
  });

  it('should use the current locale and currency from the mocked functions', () => {
    mockI18n.mockReturnValue({
      locale: 'fr-FR',
    });
    mockSelectCurrentCurrency.mockReturnValue('EUR');

    renderHook(() => useFiatFormatter());

    expect(selectCurrentCurrency).toHaveBeenCalledTimes(1);
  });

  it('should gracefully handle unknown currencies by returning amount followed by currency code', () => {
    mockSelectCurrentCurrency.mockReturnValue('storj');

    const { result } = renderHook(() => useFiatFormatter());
    const formatFiat = result.current;

    // Testing the fallback formatting for an unknown currency
    expect(formatFiat(new BigNumber('98754321987654321987654321'))).toBe(
      '98754321987654321987654321 storj',
    );
    expect(formatFiat(new BigNumber(1000))).toBe('1000 storj');
    expect(formatFiat(new BigNumber(500.5))).toBe('500.5 storj');
    expect(formatFiat(new BigNumber(0))).toBe('0 storj');
  });
});
