import type { QuickBuyTarget } from '../../../UI/QuickBuy';
import {
  beginPostSwapShareSession,
  clearPostSwapShareSession,
  consumePostSwapShareReopen,
  getPostSwapShareSession,
  patchPostSwapShareSession,
  requestPostSwapShareReopen,
} from './postSwapShareSession';

const target: QuickBuyTarget = {
  tokenAddress: '0xpump',
  tokenSymbol: 'PUMP',
  tokenName: 'Pump',
  chain: 'eip155:8453',
};

describe('postSwapShareSession', () => {
  afterEach(() => {
    clearPostSwapShareSession();
  });

  it('begins a pending session', () => {
    beginPostSwapShareSession({
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

    expect(getPostSwapShareSession()?.status).toBe('pending');
    expect(getPostSwapShareSession()?.reopenRequested).toBe(false);
  });

  it('patches transaction hash onto the current session', () => {
    const sessionId = beginPostSwapShareSession({
      target,
      tradeMode: 'buy',
      preview: {
        tokenSymbol: 'PUMP',
        tokenAddress: '0xpump',
        chain: 'base',
        side: 'buy',
      },
    });

    patchPostSwapShareSession(sessionId, {
      transactionHash: '0xabc',
      status: 'complete',
    });

    expect(getPostSwapShareSession()?.transactionHash).toBe('0xabc');
    expect(getPostSwapShareSession()?.status).toBe('complete');
  });

  it('returns the target and clears the session on consume reopen', () => {
    beginPostSwapShareSession({
      target,
      tradeMode: 'buy',
      preview: {
        tokenSymbol: 'PUMP',
        tokenAddress: '0xpump',
        chain: 'base',
        side: 'buy',
      },
    });
    requestPostSwapShareReopen();

    const reopened = consumePostSwapShareReopen();

    expect(reopened).toEqual(target);
    expect(getPostSwapShareSession()).toBeNull();
  });

  it('returns null from consume when reopen was not requested', () => {
    beginPostSwapShareSession({
      target,
      tradeMode: 'buy',
      preview: {
        tokenSymbol: 'PUMP',
        tokenAddress: '0xpump',
        chain: 'base',
        side: 'buy',
      },
    });

    expect(consumePostSwapShareReopen()).toBeNull();
  });

  it('ignores patches when no session exists', () => {
    patchPostSwapShareSession('missing', { status: 'complete' });

    expect(getPostSwapShareSession()).toBeNull();
  });

  it('ignores patches from an older share session', () => {
    const firstSessionId = beginPostSwapShareSession({
      target,
      tradeMode: 'buy',
      preview: {
        tokenSymbol: 'PUMP',
        tokenAddress: '0xpump',
        chain: 'base',
        side: 'buy',
      },
    });
    beginPostSwapShareSession({
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
      patchPostSwapShareSession(firstSessionId, { status: 'complete' }),
    ).toBe(false);
    expect(getPostSwapShareSession()?.status).toBe('pending');
  });

  it('ignores reopen requests when no session exists', () => {
    requestPostSwapShareReopen();

    expect(getPostSwapShareSession()).toBeNull();
  });
});
