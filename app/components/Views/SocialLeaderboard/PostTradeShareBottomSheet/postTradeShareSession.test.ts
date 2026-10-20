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

    expect(getPostTradeShareSession()?.transactionHash).toBe('0xabc');
    expect(getPostTradeShareSession()?.status).toBe('complete');
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

  it('ignores reopen requests when no session exists', () => {
    requestPostTradeShareReopen();

    expect(getPostTradeShareSession()).toBeNull();
  });
});
