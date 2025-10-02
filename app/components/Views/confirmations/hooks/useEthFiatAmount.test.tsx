import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { useEthFiatAmount } from './useEthFiatAmount';
import BigNumber from 'bignumber.js';
import { transferTransactionStateMock } from '../__mocks__/transfer-transaction-mock';
import { merge } from 'lodash';

describe('useEthFiatAmount', () => {
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
    const { result } = renderHookWithProvider(
      () => useEthFiatAmount('1', { showFiat: true }, false),
      { state: mockState },
    );

    expect(result.current).toBe('$3,000.00 USD');
  });

  it('returns formatted fiat amount without currency symbol when hideCurrencySymbol is true', () => {
    const { result } = renderHookWithProvider(
      () => useEthFiatAmount('1', { showFiat: true }, true),
      { state: mockState },
    );

    expect(result.current).toBe('$3,000.00');
  });

  it('returns "< $0.01" for small fiat amounts', () => {
    const { result } = renderHookWithProvider(
      () => useEthFiatAmount('0.000001', { showFiat: true }, false),
      { state: mockState },
    );

    expect(result.current).toBe('< $0.01 USD');
  });

  it('returns "< $0.01" without currency symbol for small fiat amounts', () => {
    const { result } = renderHookWithProvider(
      () => useEthFiatAmount('0.000001', { showFiat: true }, true),
      { state: mockState },
    );

    expect(result.current).toBe('< $0.01');
  });

  it('handles BigNumber input for ethAmount', () => {
    const { result } = renderHookWithProvider(
      () => useEthFiatAmount(new BigNumber('1'), { showFiat: true }, false),
      { state: mockState },
    );

    expect(result.current).toBe('$3,000.00 USD');
  });
});
