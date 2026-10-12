import { act, renderHook } from '@testing-library/react-native';
import type { QuickBuyTarget } from '../../../UI/QuickBuy';
import {
  beginPostSwapShareSession,
  clearPostSwapShareSession,
  requestPostSwapShareReopen,
} from './postSwapShareSession';
import { usePostSwapShareReopen } from './usePostSwapShareReopen';

const target: QuickBuyTarget = {
  tokenAddress: '0xpump',
  tokenSymbol: 'PUMP',
  tokenName: 'Pump',
  chain: 'eip155:8453',
};

const preview = {
  tokenSymbol: 'PUMP',
  tokenAddress: '0xpump',
  chain: 'base',
  side: 'buy' as const,
};

describe('usePostSwapShareReopen', () => {
  afterEach(() => {
    act(() => {
      clearPostSwapShareSession();
    });
  });

  it('calls onReopen with the target when a reopen is requested', () => {
    const onReopen = jest.fn();
    renderHook(() => usePostSwapShareReopen(onReopen));

    act(() => {
      beginPostSwapShareSession({
        target,
        tradeMode: 'buy',
        preview,
      });
      requestPostSwapShareReopen();
    });

    expect(onReopen).toHaveBeenCalledWith(target);
  });

  it('does not call onReopen when the session is cleared', () => {
    const onReopen = jest.fn();
    renderHook(() => usePostSwapShareReopen(onReopen));

    act(() => {
      clearPostSwapShareSession();
    });

    expect(onReopen).not.toHaveBeenCalled();
  });
});
