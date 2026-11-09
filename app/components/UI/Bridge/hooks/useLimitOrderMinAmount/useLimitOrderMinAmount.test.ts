import { renderHook } from '@testing-library/react-native';
import type { Hex } from '@metamask/utils';
import type { BridgeToken } from '../../types';
import { useLiveTokenFiatRate } from '../useLiveTokenFiatRate';
import { useFiatToUsdRate } from '../useFiatToUsdRate';
import { getLimitOrderMinAmountUsd } from '../../utils/limitOrders/getLimitOrderMinAmountUsd';
import { useLimitOrderMinAmount } from '.';

jest.mock('../useLiveTokenFiatRate', () => ({
  useLiveTokenFiatRate: jest.fn(),
}));

jest.mock('../useFiatToUsdRate', () => ({
  useFiatToUsdRate: jest.fn(),
}));

jest.mock('../../utils/limitOrders/getLimitOrderMinAmountUsd', () => ({
  getLimitOrderMinAmountUsd: jest.fn(),
}));

const sourceToken: BridgeToken = {
  address: '0x0000000000000000000000000000000000000000',
  chainId: '0x1' as Hex,
  decimals: 18,
  name: 'Ether',
  symbol: 'ETH',
};

const renderMinAmount = (sourceAmount: string | undefined) =>
  renderHook(() => useLimitOrderMinAmount({ sourceToken, sourceAmount })).result
    .current;

describe('useLimitOrderMinAmount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getLimitOrderMinAmountUsd).mockReturnValue(50);
    jest.mocked(useLiveTokenFiatRate).mockReturnValue(2000);
    jest.mocked(useFiatToUsdRate).mockReturnValue(1);
  });

  it('resolves the minimum for the source token chain', () => {
    const { minAmountUsd } = renderMinAmount('1');

    expect(getLimitOrderMinAmountUsd).toHaveBeenCalledWith('0x1');
    expect(minAmountUsd).toBe(50);
  });

  it('values the amount at the live rate of the source token', () => {
    renderMinAmount('1');

    expect(useLiveTokenFiatRate).toHaveBeenCalledWith(sourceToken);
    expect(useFiatToUsdRate).toHaveBeenCalledWith('0x1');
  });

  it('converts a live rate in another display currency to USD', () => {
    // €2000 per ETH at $1.10 per € = $2200 per ETH
    jest.mocked(useFiatToUsdRate).mockReturnValue(1.1);

    // 0.0228 ETH * $2200 = $50.16
    expect(renderMinAmount('0.0228').isBelowMinAmount).toBe(false);
    // 0.0227 ETH * $2200 = $49.94
    expect(renderMinAmount('0.0227').isBelowMinAmount).toBe(true);
  });

  it('does not report the amount as below the minimum without a fiat to USD rate', () => {
    jest.mocked(useFiatToUsdRate).mockReturnValue(undefined);

    const { isBelowMinAmount } = renderMinAmount('0.0001');

    expect(isBelowMinAmount).toBe(false);
  });

  it('reports an amount worth less than the minimum as below it', () => {
    // 0.02 ETH * $2000 = $40
    const { isBelowMinAmount } = renderMinAmount('0.02');

    expect(isBelowMinAmount).toBe(true);
  });

  it('does not report an amount worth exactly the minimum as below it', () => {
    // 0.025 ETH * $2000 = $50
    const { isBelowMinAmount } = renderMinAmount('0.025');

    expect(isBelowMinAmount).toBe(false);
  });

  it.each([
    // $50 / $3000 truncated to 18 decimals = $49.999999999999998
    { minAmountUsd: 50, usdRate: 3000, sourceAmount: '0.016666666666666666' },
    // $1 / $3 truncated to 18 decimals = $0.999999999999999999
    { minAmountUsd: 1, usdRate: 3, sourceAmount: '0.333333333333333333' },
  ])(
    'does not report the minimum entered in fiat ($$minAmountUsd) as below it',
    ({ minAmountUsd, usdRate, sourceAmount }) => {
      jest.mocked(getLimitOrderMinAmountUsd).mockReturnValue(minAmountUsd);
      jest.mocked(useLiveTokenFiatRate).mockReturnValue(usdRate);

      const { isBelowMinAmount } = renderMinAmount(sourceAmount);

      expect(isBelowMinAmount).toBe(false);
    },
  );

  it('reports an amount worth a cent less than the minimum as below it', () => {
    // 0.024995 ETH * $2000 = $49.99
    const { isBelowMinAmount } = renderMinAmount('0.024995');

    expect(isBelowMinAmount).toBe(true);
  });

  it('does not report an amount worth more than the minimum as below it', () => {
    // 1 ETH * $2000 = $2000
    const { isBelowMinAmount } = renderMinAmount('1');

    expect(isBelowMinAmount).toBe(false);
  });

  it.each([undefined, ''])(
    'reports a missing amount (%p) as below the minimum',
    (sourceAmount) => {
      const { isBelowMinAmount } = renderMinAmount(sourceAmount);

      expect(isBelowMinAmount).toBe(true);
    },
  );

  it('does not report the amount as below the minimum without a USD price', () => {
    jest.mocked(useLiveTokenFiatRate).mockReturnValue(undefined);

    const { isBelowMinAmount } = renderMinAmount('0.0001');

    expect(isBelowMinAmount).toBe(false);
  });

  it('does not report the amount as below the minimum when none is configured', () => {
    jest.mocked(getLimitOrderMinAmountUsd).mockReturnValue(undefined);

    const { isBelowMinAmount, minAmountUsd } = renderMinAmount('0.0001');

    expect(isBelowMinAmount).toBe(false);
    expect(minAmountUsd).toBeUndefined();
  });

  it('does not report an amount that is not a number as below the minimum', () => {
    const { isBelowMinAmount } = renderMinAmount('.');

    expect(isBelowMinAmount).toBe(false);
  });
});
