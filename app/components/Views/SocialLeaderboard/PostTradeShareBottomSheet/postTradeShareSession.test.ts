import type { QuickBuyTarget } from '../../../UI/QuickBuy';
import {
  beginPostTradeShareSession,
  clearPostTradeShareSession,
  consumePostTradeShareReopen,
  getPostTradeShareSession,
  hasPostTradeShareReopenOwner,
  patchPostTradeShareSession,
  registerPostTradeShareReopenOwner,
  requestPostTradeShareReopen,
  subscribePostTradeShareSession,
} from './postTradeShareSession';

const target: QuickBuyTarget = {
  tokenAddress: '0xpump',
  tokenSymbol: 'PUMP',
  tokenName: 'Pump',
  chain: 'eip155:8453',
};

describe('postTradeShareSession', () => {
  afterEach(() => {
    clearPostTradeShareSession();
  });

  describe('variant', () => {
    it('defaults to share', () => {
      beginPostTradeShareSession({
        target,
        tradeMode: 'buy',
        preview: {
          tokenSymbol: 'PUMP',
          tokenAddress: '0xpump',
          chain: 'base',
          side: 'buy',
        },
      });

      expect(getPostTradeShareSession()?.variant).toBe('share');
    });

    it('keeps create_profile across patches', () => {
      const sessionId = beginPostTradeShareSession({
        variant: 'create_profile',
        product: 'perps',
        preview: {
          product: 'perps',
          tokenSymbol: 'ETH',
          tradeSymbol: 'ETH',
          tokenAddress: 'ETH',
          direction: 'long',
        },
      });

      patchPostTradeShareSession(sessionId, {
        status: 'complete',
        orderId: '42',
      });

      expect(getPostTradeShareSession()).toEqual(
        expect.objectContaining({
          variant: 'create_profile',
          status: 'complete',
        }),
      );
    });
  });

  it('begins a pending session', () => {
    beginPostTradeShareSession({
      target,
      tradeMode: 'buy',
      tradeInFlightChain: 'base',
      preview: {
        tokenSymbol: 'PUMP',
        tokenAddress: '0xpump',
        chain: 'base',
        side: 'buy',
      },
    });

    expect(getPostTradeShareSession()?.status).toBe('pending');
    expect(getPostTradeShareSession()?.reopenRequested).toBe(false);
  });

  it('patches transaction hash onto the current session', () => {
    const sessionId = beginPostTradeShareSession({
      target,
      tradeMode: 'buy',
      preview: {
        tokenSymbol: 'PUMP',
        tokenAddress: '0xpump',
        chain: 'base',
        side: 'buy',
      },
    });

    patchPostTradeShareSession(sessionId, {
      transactionHash: '0xabc',
      status: 'complete',
    });

    const session = getPostTradeShareSession();
    expect(session?.product).toBe('spot');
    if (session?.product !== 'spot') {
      return;
    }
    expect(session.transactionHash).toBe('0xabc');
    expect(session.status).toBe('complete');
  });

  it('returns the target and clears the session on consume reopen', () => {
    beginPostTradeShareSession({
      target,
      tradeMode: 'buy',
      preview: {
        tokenSymbol: 'PUMP',
        tokenAddress: '0xpump',
        chain: 'base',
        side: 'buy',
      },
    });
    requestPostTradeShareReopen();

    const reopened = consumePostTradeShareReopen();

    expect(reopened).toEqual({
      target,
      copyTradeOrigin: undefined,
      tradeMode: 'buy',
    });
    expect(getPostTradeShareSession()).toBeNull();
  });

  it('returns the copy-trade origin and keeps it across patches', () => {
    const copyTradeOrigin = { commentId: 'comment-1' };
    const sessionId = beginPostTradeShareSession({
      target,
      tradeMode: 'buy',
      copyTradeOrigin,
      preview: {
        tokenSymbol: 'PUMP',
        tokenAddress: '0xpump',
        chain: 'base',
        side: 'buy',
      },
    });

    patchPostTradeShareSession(sessionId, { status: 'failed' });
    requestPostTradeShareReopen();

    expect(consumePostTradeShareReopen()).toEqual({
      target,
      copyTradeOrigin,
      tradeMode: 'buy',
    });
    expect(getPostTradeShareSession()).toBeNull();
  });

  it('returns null from consume when reopen was not requested', () => {
    beginPostTradeShareSession({
      target,
      tradeMode: 'buy',
      preview: {
        tokenSymbol: 'PUMP',
        tokenAddress: '0xpump',
        chain: 'base',
        side: 'buy',
      },
    });

    expect(consumePostTradeShareReopen()).toBeNull();
  });

  it('ignores patches when no session exists', () => {
    patchPostTradeShareSession('missing', { status: 'complete' });

    expect(getPostTradeShareSession()).toBeNull();
  });

  it('ignores patches from an older share session', () => {
    const firstSessionId = beginPostTradeShareSession({
      target,
      tradeMode: 'buy',
      preview: {
        tokenSymbol: 'PUMP',
        tokenAddress: '0xpump',
        chain: 'base',
        side: 'buy',
      },
    });
    beginPostTradeShareSession({
      target,
      tradeMode: 'sell',
      preview: {
        tokenSymbol: 'PUMP',
        tokenAddress: '0xpump',
        chain: 'base',
        side: 'sell',
      },
    });

    expect(
      patchPostTradeShareSession(firstSessionId, { status: 'complete' }),
    ).toBe(false);
    expect(getPostTradeShareSession()?.status).toBe('pending');
  });

  it('patches a perps session to complete with the order id', () => {
    const sessionId = beginPostTradeShareSession({
      product: 'perps',
      preview: {
        product: 'perps',
        tokenSymbol: 'ETH',
        tradeSymbol: 'ETH',
        tokenAddress: 'ETH',
        direction: 'long',
      },
    });

    expect(getPostTradeShareSession()?.status).toBe('pending');

    patchPostTradeShareSession(sessionId, {
      orderId: '42',
      status: 'complete',
    });

    const session = getPostTradeShareSession();
    expect(session?.product).toBe('perps');
    if (session?.product !== 'perps') {
      return;
    }
    expect(session.orderId).toBe('42');
    expect(session.status).toBe('complete');
  });

  it('ignores a perps patch after the session was cleared', () => {
    const sessionId = beginPostTradeShareSession({
      product: 'perps',
      preview: {
        product: 'perps',
        tokenSymbol: 'ETH',
        tradeSymbol: 'ETH',
        tokenAddress: 'ETH',
        direction: 'long',
      },
    });
    clearPostTradeShareSession();

    expect(patchPostTradeShareSession(sessionId, { status: 'complete' })).toBe(
      false,
    );
    expect(getPostTradeShareSession()).toBeNull();
  });

  it('ignores reopen requests when no session exists', () => {
    requestPostTradeShareReopen();

    expect(getPostTradeShareSession()).toBeNull();
  });

  describe('reopen owners', () => {
    it('tracks an owner until it unregisters', () => {
      const unregister = registerPostTradeShareReopenOwner('social-v1-feed');

      expect(hasPostTradeShareReopenOwner('social-v1-feed')).toBe(true);

      unregister();

      expect(hasPostTradeShareReopenOwner('social-v1-feed')).toBe(false);
    });

    it('keeps an owner registered while another instance is mounted', () => {
      const unregisterFirst =
        registerPostTradeShareReopenOwner('position-details');
      const unregisterSecond =
        registerPostTradeShareReopenOwner('position-details');

      unregisterFirst();

      expect(hasPostTradeShareReopenOwner('position-details')).toBe(true);

      unregisterSecond();

      expect(hasPostTradeShareReopenOwner('position-details')).toBe(false);
    });

    it('ignores a repeated unregister call', () => {
      const unregisterFirst =
        registerPostTradeShareReopenOwner('trader-position');
      const unregisterSecond =
        registerPostTradeShareReopenOwner('trader-position');

      unregisterFirst();
      unregisterFirst();

      expect(hasPostTradeShareReopenOwner('trader-position')).toBe(true);

      unregisterSecond();
    });

    it('notifies subscribers on register and unregister', () => {
      const listener = jest.fn();
      const unsubscribe = subscribePostTradeShareSession(listener);

      const unregister = registerPostTradeShareReopenOwner('social-v1-feed');
      unregister();

      expect(listener).toHaveBeenCalledTimes(2);
      unsubscribe();
    });
  });
});
