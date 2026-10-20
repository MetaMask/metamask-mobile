import { act, renderHook } from '@testing-library/react-native';
import type { QuickBuyTarget } from '../../../UI/QuickBuy';
import {
  beginPostTradeShareSession,
  clearPostTradeShareSession,
  requestPostTradeShareReopen,
} from './postTradeShareSession';
import { usePostTradeShareReopen } from './usePostTradeShareReopen';

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

describe('usePostTradeShareReopen', () => {
  afterEach(() => {
    act(() => {
      clearPostTradeShareSession();
    });
  });

  it('calls onReopen with the target when a reopen is requested', () => {
    const onReopen = jest.fn();
    renderHook(() => usePostTradeShareReopen(onReopen));

    act(() => {
      beginPostTradeShareSession({
        target,
        tradeMode: 'buy',
        preview,
      });
      requestPostTradeShareReopen();
    });

    expect(onReopen).toHaveBeenCalledWith(target, undefined);
  });

  it('calls onReopen with the copy-trade origin when the session has one', () => {
    const onReopen = jest.fn();
    const copyTradeOrigin = { commentId: 'comment-1' };
    renderHook(() => usePostTradeShareReopen(onReopen));

    act(() => {
      beginPostTradeShareSession({
        target,
        tradeMode: 'buy',
        preview,
        copyTradeOrigin,
      });
      requestPostTradeShareReopen();
    });

    expect(onReopen).toHaveBeenCalledWith(target, copyTradeOrigin);
  });

  it('leaves the retry for a later listener when this screen is not focused', () => {
    const hiddenReopen = jest.fn();
    const visibleReopen = jest.fn();
    renderHook(() => usePostTradeShareReopen(hiddenReopen, false));
    renderHook(() => usePostTradeShareReopen(visibleReopen, true));

    act(() => {
      beginPostTradeShareSession({
        target,
        tradeMode: 'buy',
        preview,
      });
      requestPostTradeShareReopen();
    });

    expect(hiddenReopen).not.toHaveBeenCalled();
    expect(visibleReopen).toHaveBeenCalledWith(target, undefined);
  });

  it('does not call onReopen when the session is cleared', () => {
    const onReopen = jest.fn();
    renderHook(() => usePostTradeShareReopen(onReopen));

    act(() => {
      clearPostTradeShareSession();
    });

    expect(onReopen).not.toHaveBeenCalled();
  });
});
