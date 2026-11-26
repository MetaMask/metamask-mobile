import { renderHook } from '@testing-library/react-native';
import BigNumber from 'bignumber.js';
import { moneyFormatFiat } from '../../Money/utils/moneyFormatFiat';
import useMoneyAccountBalance from '../../Money/hooks/useMoneyAccountBalance';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { useBridgeMoneyAccountBalance } from './useBridgeMoneyAccountBalance';

jest.mock('react-redux', () => ({
  useSelector: (selector: (state?: unknown) => unknown) => selector(undefined),
}));

jest.mock('../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: jest.fn(),
  selectCurrencyRates: jest.fn(),
}));

jest.mock('../../Money/hooks/useMoneyAccountBalance', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockSelectCurrentCurrency = jest.mocked(selectCurrentCurrency);
const mockSelectCurrencyRates = jest.mocked(selectCurrencyRates);
const mockUseMoneyAccountBalance = jest.mocked(useMoneyAccountBalance);

describe('useBridgeMoneyAccountBalance', () => {
  beforeEach(() => {
    mockUseMoneyAccountBalance.mockReturnValue({
      tokenTotal: new BigNumber(10),
      withdrawableMusd: new BigNumber(4),
    } as ReturnType<typeof useMoneyAccountBalance>);
    mockSelectCurrencyRates.mockReturnValue({});
  });

  it('keeps the mUSD amount when the selected currency is USD', () => {
    mockSelectCurrentCurrency.mockReturnValue('usd');

    const { result } = renderHook(() => useBridgeMoneyAccountBalance());

    expect(result.current.currency).toBe('usd');
    expect(result.current.totalFiat?.toString()).toBe('10');
    expect(result.current.withdrawableFiat?.toString()).toBe('4');
    expect(result.current.totalFiatFormatted).toBe(
      moneyFormatFiat(new BigNumber(10), 'usd'),
    );
  });

  it('converts the mUSD amount into the selected currency', () => {
    const usdToFiatRate = 2000 / 2160;
    const totalFiat = new BigNumber(10).multipliedBy(usdToFiatRate);
    mockSelectCurrentCurrency.mockReturnValue('eur');
    mockSelectCurrencyRates.mockReturnValue({
      ETH: {
        conversionRate: 2000,
        usdConversionRate: 2160,
        conversionDate: Date.now(),
      },
    });

    const { result } = renderHook(() => useBridgeMoneyAccountBalance());

    expect(result.current.totalFiat?.toString()).toBe(totalFiat.toString());
    expect(result.current.withdrawableFiat?.toString()).toBe(
      new BigNumber(4).multipliedBy(usdToFiatRate).toString(),
    );
    expect(result.current.totalFiatFormatted).toBe(
      moneyFormatFiat(totalFiat, 'eur'),
    );
    expect(result.current.tokenTotal?.toString()).toBe('10');
  });

  it('omits the fiat amount when the selected currency has no rate', () => {
    mockSelectCurrentCurrency.mockReturnValue('eur');

    const { result } = renderHook(() => useBridgeMoneyAccountBalance());

    expect(result.current.totalFiat).toBeUndefined();
    expect(result.current.withdrawableFiatFormatted).toBeUndefined();
    expect(result.current.withdrawableMusd?.toString()).toBe('4');
  });
});
