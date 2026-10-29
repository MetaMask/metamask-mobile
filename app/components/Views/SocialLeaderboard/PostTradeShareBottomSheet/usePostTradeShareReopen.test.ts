import { act, renderHook } from '@testing-library/react-native';
import type { QuickBuyTarget } from '../../../UI/QuickBuy';
import {
  beginPostTradeShareSession,
  clearPostTradeShareSession,
  hasPostTradeShareReopenOwner,
  PostTradeShareOwner,
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
    renderHook(() =>
      usePostTradeShareReopen(onReopen, PostTradeShareOwner.socialV1Feed),
    );

    act(() => {
      beginPostTradeShareSession({
        target,
        tradeMode: 'buy',
        preview,
        owner: PostTradeShareOwner.socialV1Feed,
      });
      requestPostTradeShareReopen();
    });

    expect(onReopen).toHaveBeenCalledWith(target, undefined, 'buy');
  });

  it('calls onReopen with the copy-trade origin when the session has one', () => {
    const onReopen = jest.fn();
    const copyTradeOrigin = { commentId: 'comment-1' };
    renderHook(() =>
      usePostTradeShareReopen(onReopen, PostTradeShareOwner.socialV1Feed),
    );

    act(() => {
      beginPostTradeShareSession({
        target,
        tradeMode: 'buy',
        preview,
        copyTradeOrigin,
        owner: PostTradeShareOwner.socialV1Feed,
      });
      requestPostTradeShareReopen();
    });

    expect(onReopen).toHaveBeenCalledWith(target, copyTradeOrigin, 'buy');
  });

  it('leaves a position retry for the position screen while the feed is mounted', () => {
    const feedReopen = jest.fn();
    const positionReopen = jest.fn();
    renderHook(() =>
      usePostTradeShareReopen(feedReopen, PostTradeShareOwner.socialV1Feed),
    );
    renderHook(() =>
      usePostTradeShareReopen(
        positionReopen,
        PostTradeShareOwner.positionDetails,
      ),
    );

    act(() => {
      beginPostTradeShareSession({
        target,
        tradeMode: 'sell',
        preview,
        owner: PostTradeShareOwner.positionDetails,
      });
      requestPostTradeShareReopen();
    });

    expect(feedReopen).not.toHaveBeenCalled();
    expect(positionReopen).toHaveBeenCalledWith(target, undefined, 'sell');
  });

  it('registers the owner while mounted and unregisters on unmount', () => {
    const { unmount } = renderHook(() =>
      usePostTradeShareReopen(jest.fn(), PostTradeShareOwner.socialV1Feed),
    );

    expect(hasPostTradeShareReopenOwner(PostTradeShareOwner.socialV1Feed)).toBe(
      true,
    );

    unmount();

    expect(hasPostTradeShareReopenOwner(PostTradeShareOwner.socialV1Feed)).toBe(
      false,
    );
  });

  it('unregisters the owner when it becomes undefined', () => {
    const { rerender } = renderHook(
      ({ owner }: { owner?: typeof PostTradeShareOwner.socialV1Feed }) =>
        usePostTradeShareReopen(jest.fn(), owner),
      {
        initialProps: {
          owner: PostTradeShareOwner.socialV1Feed as
            | typeof PostTradeShareOwner.socialV1Feed
            | undefined,
        },
      },
    );

    rerender({ owner: undefined });

    expect(hasPostTradeShareReopenOwner(PostTradeShareOwner.socialV1Feed)).toBe(
      false,
    );
  });

  it('does not call onReopen when the session is cleared', () => {
    const onReopen = jest.fn();
    renderHook(() =>
      usePostTradeShareReopen(onReopen, PostTradeShareOwner.socialV1Feed),
    );

    act(() => {
      clearPostTradeShareSession();
    });

    expect(onReopen).not.toHaveBeenCalled();
  });
});
