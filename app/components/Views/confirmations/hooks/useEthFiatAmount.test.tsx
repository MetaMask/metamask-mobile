import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { useEthFiatAmount } from './useEthFiatAmount';
import BigNumber from 'bignumber.js';
import { transferTransactionStateMock } from '../__mocks__/transfer-transaction-mock';
import { merge } from 'lodash';
import I18n from '../../../../../locales/i18n';
import {
  selectConversionRateByChainId,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';

jest.mock('../../../../selectors/currencyRateController', () => ({
  selectConversionRateByChainId: jest.fn(),
  selectCurrentCurrency: jest.fn(),
}));

describe('useEthFiatAmount', () => {
  const mockSelectConversionRate =
    selectConversionRateByChainId as unknown as jest.Mock;
  const mockCurrentCurrency = selectCurrentCurrency as unknown as jest.Mock;
  const mockState = merge({}, transferTransactionStateMock, {
    engine: {
      backgroundState: {
        CurrencyRateController: {
          currentCurrency: 'USD',
          currencyRates: {
            ETH: { conversionRate: 3000 },
          },
        },
      },
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns undefined when conversion rate is missing', () => {
    const { result } = renderHookWithProvider(() =>
      useEthFiatAmount('1', { showFiat: true }),
    );

    expect(result.current).toBeUndefined();
  });

  it('returns undefined when showFiat is false', () => {
    const { result } = renderHookWithProvider(() =>
      useEthFiatAmount('1', { showFiat: false }),
    );

    expect(result.current).toBeUndefined();
  });

  it('returns undefined when ethAmount is undefined', () => {
    const { result } = renderHookWithProvider(() =>
      useEthFiatAmount(undefined, { showFiat: true }),
    );

    expect(result.current).toBeUndefined();
  });

  it('returns undefined when current currency is ETH', () => {
    const { result } = renderHookWithProvider(() =>
      useEthFiatAmount('1', { showFiat: true }),
    );

    expect(result.current).toBeUndefined();
  });

  it('returns formatted fiat amount when all conditions are met', () => {
    mockSelectConversionRate.mockReturnValue(3000);
    mockCurrentCurrency.mockReturnValue('USD');
    const { result } = renderHookWithProvider(
      () => useEthFiatAmount('1', { showFiat: true }, false),
      { state: mockState },
    );

    expect(result.current).toBe('$3,000.00 USD');
  });

  it('returns formatted fiat amount without currency symbol when hideCurrencySymbol is true', () => {
    mockSelectConversionRate.mockReturnValue(3000);
    mockCurrentCurrency.mockReturnValue('USD');
    const { result } = renderHookWithProvider(
      () => useEthFiatAmount('1', { showFiat: true }, true),
      { state: mockState },
    );

    expect(result.current).toBe('$3,000.00');
  });

  it('returns "< $0.01" for small fiat amounts', () => {
    mockSelectConversionRate.mockReturnValue(3000);
    mockCurrentCurrency.mockReturnValue('USD');
    const { result } = renderHookWithProvider(
      () => useEthFiatAmount('0.000001', { showFiat: true }, false),
      { state: mockState },
    );

    expect(result.current).toBe('< $0.01 USD');
  });

  it('returns "< $0.01" without currency symbol for small fiat amounts', () => {
    mockSelectConversionRate.mockReturnValue(3000);
    mockCurrentCurrency.mockReturnValue('USD');
    const { result } = renderHookWithProvider(
      () => useEthFiatAmount('0.000001', { showFiat: true }, true),
      { state: mockState },
    );

    expect(result.current).toBe('< $0.01');
  });

  it('handles BigNumber input for ethAmount', () => {
    mockSelectConversionRate.mockReturnValue(3000);
    mockCurrentCurrency.mockReturnValue('USD');
    const { result } = renderHookWithProvider(
      () => useEthFiatAmount(new BigNumber('1'), { showFiat: true }, false),
      { state: mockState },
    );

    expect(result.current).toBe('$3,000.00 USD');
  });

  it.each([
    ['EUR', 'de', '0.4', '1.200,00\u00a0€'],
    ['EUR', 'de', '0.000001', '< 0,01\u00a0€'],
    ['JPY', 'en', '0.4', '¥1,200'],
  ])(
    'formats %s in the %s app language',
    (currency, locale, ethAmount, expected) => {
      const originalLocale = I18n.locale;
      I18n.locale = locale;
      mockSelectConversionRate.mockReturnValue(3000);
      mockCurrentCurrency.mockReturnValue(currency);

      const { result } = renderHookWithProvider(
        () => useEthFiatAmount(ethAmount, { showFiat: true }, true),
        { state: mockState },
      );

      I18n.locale = originalLocale;
      expect(result.current).toBe(expected);
    },
  );
});
