import { renderHook } from '@testing-library/react-native';
import type { Hex } from '@metamask/utils';
import type { BridgeToken } from '../../types';
import { useTokenUsdRate } from '../useTokenFiatRate';
import { getLimitOrderMinAmountUsd } from '../../utils/limitOrders/getLimitOrderMinAmountUsd';
import { useLimitOrderMinAmount } from '.';

jest.mock('../useTokenFiatRate', () => ({
  useTokenUsdRate: jest.fn(),
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
    jest.mocked(useTokenUsdRate).mockReturnValue(2000);
  });

  it('resolves the minimum for the source token chain', () => {
    const { minAmountUsd } = renderMinAmount('1');

    expect(getLimitOrderMinAmountUsd).toHaveBeenCalledWith('0x1');
    expect(minAmountUsd).toBe(50);
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
    jest.mocked(useTokenUsdRate).mockReturnValue(undefined);

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
