import { renderHook } from '@testing-library/react-native';
import type { Hex } from '@metamask/utils';
import { useSelector } from 'react-redux';
import type { BridgeToken } from '../../types';
import { getRecurringOrderMinAmountUsd } from '../../utils/recurringOrders';
import { useFiatToUsdRate } from '../useFiatToUsdRate';
import { useLiveTokenFiatRate } from '../useLiveTokenFiatRate';
import { useRecurringOrderMinAmount } from '.';

jest.mock('../useLiveTokenFiatRate', () => ({
  useLiveTokenFiatRate: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../useFiatToUsdRate', () => ({
  useFiatToUsdRate: jest.fn(),
}));

jest.mock('../../utils/recurringOrders', () => ({
  getRecurringOrderMinAmountUsd: jest.fn(),
}));

const sourceToken: BridgeToken = {
  address: '0x0000000000000000000000000000000000000000',
  chainId: '0x1' as Hex,
  decimals: 18,
  name: 'Ether',
  symbol: 'ETH',
};

function renderMinAmount(sourceAmount: string | undefined) {
  return renderHook(() =>
    useRecurringOrderMinAmount({ sourceToken, sourceAmount }),
  ).result.current;
}

describe('useRecurringOrderMinAmount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getRecurringOrderMinAmountUsd).mockReturnValue(50);
    jest.mocked(useLiveTokenFiatRate).mockReturnValue(2000);
    jest.mocked(useFiatToUsdRate).mockReturnValue(1);
    jest.mocked(useSelector).mockReturnValue('usd');
  });

  it('resolves the minimum for the source token chain', () => {
    const { minAmountUsd } = renderMinAmount('1');

    expect(getRecurringOrderMinAmountUsd).toHaveBeenCalledWith('0x1');
    expect(minAmountUsd).toBe(50);
  });

  it('values the amount at the live rate of the source token', () => {
    renderMinAmount('1');

    expect(useLiveTokenFiatRate).toHaveBeenCalledWith(sourceToken);
    expect(useFiatToUsdRate).toHaveBeenCalledWith('0x1');
  });

  it('converts a live rate in another display currency to USD', () => {
    jest.mocked(useFiatToUsdRate).mockReturnValue(1.1);

    expect(renderMinAmount('0.0228').isBelowMinAmount).toBe(false);
    expect(renderMinAmount('0.0227').isBelowMinAmount).toBe(true);
  });

  it('formats the minimum in the selected currency', () => {
    jest.mocked(useSelector).mockReturnValue('eur');
    jest.mocked(useFiatToUsdRate).mockReturnValue(1.25);

    expect(renderMinAmount('1').formattedMinAmountInSelectedCurrency).toBe(
      '€40',
    );
  });

  it.each([undefined, 0, Number.NaN, Number.POSITIVE_INFINITY])(
    'returns an error when the selected currency rate is %p',
    (fiatToUsdRate) => {
      jest.mocked(useSelector).mockReturnValue('eur');
      jest.mocked(useFiatToUsdRate).mockReturnValue(fiatToUsdRate);

      const result = renderMinAmount('1');

      expect(result.formattedMinAmountInSelectedCurrency).toBeUndefined();
      expect(result.hasError).toBe(true);
    },
  );

  it('reports an amount worth less than the minimum as below it', () => {
    const { isBelowMinAmount } = renderMinAmount('0.02');

    expect(isBelowMinAmount).toBe(true);
  });

  it('does not report an amount worth exactly the minimum as below it', () => {
    const { isBelowMinAmount } = renderMinAmount('0.025');

    expect(isBelowMinAmount).toBe(false);
  });

  it('rounds the source amount value to the nearest USD cent', () => {
    const { isBelowMinAmount } = renderMinAmount('0.0249975');

    expect(isBelowMinAmount).toBe(false);
  });

  it.each([undefined, ''])(
    'reports a missing amount (%p) as below the minimum',
    (sourceAmount) => {
      const { isBelowMinAmount } = renderMinAmount(sourceAmount);

      expect(isBelowMinAmount).toBe(true);
    },
  );

  it.each([
    {
      name: 'fiat to USD rate',
      arrange: () => jest.mocked(useFiatToUsdRate).mockReturnValue(undefined),
      expectedHasError: true,
    },
    {
      name: 'source token price',
      arrange: () =>
        jest.mocked(useLiveTokenFiatRate).mockReturnValue(undefined),
      expectedHasError: true,
    },
    {
      name: 'configured minimum',
      arrange: () =>
        jest.mocked(getRecurringOrderMinAmountUsd).mockReturnValue(undefined),
      expectedHasError: false,
    },
  ])(
    'does not report the amount as below the minimum without a $name',
    ({ arrange, expectedHasError }) => {
      arrange();

      const { hasError, isBelowMinAmount } = renderMinAmount('0.0001');

      expect(isBelowMinAmount).toBe(false);
      expect(hasError).toBe(expectedHasError);
    },
  );

  it('does not report a non-numeric amount as below the minimum', () => {
    const { isBelowMinAmount } = renderMinAmount('.');

    expect(isBelowMinAmount).toBe(false);
  });
});
