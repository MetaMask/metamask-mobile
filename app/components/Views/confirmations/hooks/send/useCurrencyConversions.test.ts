import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { evmSendStateMock } from '../../__mocks__/send.mock';
import {
  getFiatDisplayValueFn,
  getFiatValueFn,
  getNativeValueFn,
  useCurrencyConversions,
} from './useCurrencyConversions';

jest.mock('../gas/useGasFeeEstimates', () => ({
  useGasFeeEstimates: () => ({
    gasFeeEstimates: { medium: { suggestedMaxFeePerGas: 1.5 } },
  }),
}));

const mockState = {
  state: evmSendStateMock,
};

describe('getFiatValueFn', () => {
  it('return fiat value for passed native value', () => {
    expect(
      getFiatValueFn({
        conversionRate: 1,
        exchangeRate: 3890.556,
        amount: '10',
        decimals: 2,
      }),
    ).toStrictEqual('38905.56');
  });

  it('return 0 if input is empty string', () => {
    expect(
      getFiatValueFn({
        conversionRate: 1,
        exchangeRate: 3890.556,
        amount: '',
        decimals: 2,
      }),
    ).toStrictEqual('0');
  });

  it('use conversionRate 1 if conversionRate is not passed', () => {
    expect(
      getFiatValueFn({
        conversionRate: undefined as unknown as number,
        exchangeRate: 3890.556,
        amount: '10',
        decimals: 2,
      }),
    ).toStrictEqual('38905.56');
  });
});

describe('getFiatDisplayValueFn', () => {
  it('return fiat value with currency prefix for passed native value', () => {
    expect(
      getFiatDisplayValueFn({
        conversionRate: 1,
        exchangeRate: 3890.556,
        currentCurrency: 'usd',
        amount: '10',
      }),
    ).toStrictEqual('$ 38905.56');
  });

  it('return 0 if amount is not passed', () => {
    expect(
      getFiatDisplayValueFn({
        conversionRate: 1,
        exchangeRate: 3890.556,
        currentCurrency: 'usd',
        amount: '',
      }),
    ).toStrictEqual('$ 0.00');
  });
});

describe('getNativeValueFn', () => {
  it('return native value for passed fiat value', () => {
    expect(
      getNativeValueFn({
        conversionRate: 1,
        exchangeRate: 3890.556,
        amount: '38905.56',
        decimals: 2,
      }),
    ).toStrictEqual('10');
  });

  it('return 0 if input is empty string', () => {
    expect(
      getNativeValueFn({
        conversionRate: 1,
        exchangeRate: 3890.556,
        amount: '',
        decimals: 2,
      }),
    ).toStrictEqual('0');
  });

  it('return 0 if input is invalid decimal', () => {
    expect(
      getNativeValueFn({
        conversionRate: 1,
        exchangeRate: 3890.556,
        amount: 'abc',
        decimals: 2,
      }),
    ).toStrictEqual('0');
  });
});

describe('useCurrencyConversions', () => {
  it('return conversion functions', () => {
    const { result } = renderHookWithProvider(
      () => useCurrencyConversions(),
      mockState,
    );
    expect(result.current.fiatCurrencySymbol).toBeDefined();
    expect(result.current.getFiatDisplayValue).toBeDefined();
    expect(result.current.getFiatValue).toBeDefined();
    expect(result.current.getNativeValue).toBeDefined();
  });
});
