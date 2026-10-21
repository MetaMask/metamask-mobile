import type { QuickBuyTarget } from '../../../UI/QuickBuy';
import {
  beginPostTradeShareSession,
  clearPostTradeShareSession,
  consumePostTradeShareReopen,
  getPostTradeShareSession,
  patchPostTradeShareSession,
  requestPostTradeShareReopen,
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
});
