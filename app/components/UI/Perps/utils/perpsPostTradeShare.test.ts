import {
  beginPerpsPostTradeShare,
  canBeginPerpsPostTradeShare,
  canPromptPerpsPostTrade,
  completePerpsPostTradeShare,
  failPerpsPostTradeShare,
  isPerpsPostTradeShareEligible,
  MIN_PERPS_POST_TRADE_SHARE_USD,
  openPerpsPostTradeShareSession,
} from './perpsPostTradeShare';
import {
  clearPostTradeShareSession,
  getPostTradeShareSession,
} from '../../../Views/SocialLeaderboard/PostTradeShareBottomSheet/postTradeShareSession';

const copyTradeOrigin = { commentId: 'comment-1', asset: 'ETH' };

describe('perpsPostTradeShare', () => {
  afterEach(() => {
    clearPostTradeShareSession();
  });

  describe('isPerpsPostTradeShareEligible', () => {
    it('returns false when leveraged value is below the minimum', () => {
      const result = isPerpsPostTradeShareEligible({
        amountUsd: '5',
        leverage: 1,
      });

      expect(result).toBe(false);
    });

    it('returns true when leverage brings the value to the minimum', () => {
      const result = isPerpsPostTradeShareEligible({
        amountUsd: '5',
        leverage: 2,
      });

      expect(result).toBe(true);
    });

    it('returns true at the minimum value without leverage', () => {
      const result = isPerpsPostTradeShareEligible({
        amountUsd: String(MIN_PERPS_POST_TRADE_SHARE_USD),
        leverage: 1,
      });

      expect(result).toBe(true);
    });
  });

  it('prompts only for Hyperliquid market orders', () => {
    expect(
      canPromptPerpsPostTrade({
        orderType: 'market',
        activeProvider: 'hyperliquid',
      }),
    ).toBe(true);
    expect(
      canPromptPerpsPostTrade({
        orderType: 'limit',
        activeProvider: 'hyperliquid',
      }),
    ).toBe(false);
    expect(
      canPromptPerpsPostTrade({ orderType: 'market', activeProvider: 'myx' }),
    ).toBe(false);
  });

  it('opens a pending share session without a copy-trade origin', () => {
    const sessionId = openPerpsPostTradeShareSession({
      asset: 'ETH',
      direction: 'short',
      leverage: 5,
      amountUsd: '100',
    });

    expect(getPostTradeShareSession()).toEqual(
      expect.objectContaining({
        sessionId,
        product: 'perps',
        status: 'pending',
        pairLabel: '5x Short ETH',
        tradeInFlightChain: 'hyperliquid',
        variant: 'share',
      }),
    );
  });

  it('begins a share only for a Hyperliquid order that returns one order id', () => {
    expect(
      canBeginPerpsPostTradeShare({
        copyTradeOrigin,
        orderType: 'market',
        activeProvider: 'hyperliquid',
      }),
    ).toBe(true);
    expect(
      canBeginPerpsPostTradeShare({
        copyTradeOrigin: undefined,
        orderType: 'market',
        activeProvider: 'hyperliquid',
      }),
    ).toBe(false);
    expect(
      canBeginPerpsPostTradeShare({
        copyTradeOrigin,
        orderType: 'twap',
        activeProvider: 'hyperliquid',
      }),
    ).toBe(false);
    expect(
      canBeginPerpsPostTradeShare({
        copyTradeOrigin,
        orderType: 'scale',
        activeProvider: 'hyperliquid',
      }),
    ).toBe(false);
    expect(
      canBeginPerpsPostTradeShare({
        copyTradeOrigin,
        orderType: 'chase',
        activeProvider: 'hyperliquid',
      }),
    ).toBe(false);
  });

  it('keeps a low-value copy-trade on the normal toast path', () => {
    const sessionId = beginPerpsPostTradeShare({
      copyTradeOrigin,
      orderType: 'market',
      activeProvider: 'hyperliquid',
      asset: 'ETH',
      direction: 'long',
      leverage: 1,
      amountUsd: '5',
    });

    expect(sessionId).toBeUndefined();
    expect(getPostTradeShareSession()).toBeNull();
  });

  it('opens a share for a leveraged copy-trade that reaches the minimum', () => {
    const sessionId = beginPerpsPostTradeShare({
      copyTradeOrigin,
      orderType: 'market',
      activeProvider: 'hyperliquid',
      asset: 'ETH',
      direction: 'long',
      leverage: 2,
      amountUsd: '5',
    });

    expect(sessionId).toBeDefined();
    expect(getPostTradeShareSession()).toEqual(
      expect.objectContaining({ product: 'perps', variant: 'share' }),
    );
  });

  it('completes a pending session with the order id', () => {
    const sessionId = beginPerpsPostTradeShare({
      copyTradeOrigin,
      orderType: 'market',
      activeProvider: 'hyperliquid',
      asset: 'ETH',
      direction: 'long',
      leverage: 40,
      amountUsd: '100',
    });

    expect(getPostTradeShareSession()?.status).toBe('pending');

    const completed = completePerpsPostTradeShare(sessionId, {
      orderId: '42',
      entryPrice: '3200',
    });

    const session = getPostTradeShareSession();
    expect(completed).toBe(true);
    expect(session?.status).toBe('complete');
    if (session?.product !== 'perps') {
      return;
    }
    expect(session.orderId).toBe('42');
    expect(session.preview.entryPriceLabel).toBeDefined();
  });

  it('clears a pending session when the accepted order has no order id', () => {
    const sessionId = beginPerpsPostTradeShare({
      copyTradeOrigin,
      orderType: 'market',
      activeProvider: 'hyperliquid',
      asset: 'ETH',
      direction: 'long',
    });

    const completed = completePerpsPostTradeShare(sessionId, {
      orderId: undefined,
    });

    expect(completed).toBe(false);
    expect(getPostTradeShareSession()).toBeNull();
  });

  it('leaves a closed session alone so the caller can toast', () => {
    const sessionId = beginPerpsPostTradeShare({
      copyTradeOrigin,
      orderType: 'limit',
      activeProvider: undefined,
      asset: 'ETH',
      direction: 'short',
    });
    clearPostTradeShareSession();

    expect(completePerpsPostTradeShare(sessionId, { orderId: '42' })).toBe(
      false,
    );
    expect(failPerpsPostTradeShare(sessionId)).toBe(false);
    expect(getPostTradeShareSession()).toBeNull();
  });

  it('marks the session failed when the order is rejected', () => {
    const sessionId = beginPerpsPostTradeShare({
      copyTradeOrigin,
      orderType: 'market',
      activeProvider: 'hyperliquid',
      asset: 'ETH',
      direction: 'long',
      leverage: 1,
      amountUsd: '100',
    });

    expect(failPerpsPostTradeShare(sessionId)).toBe(true);
    expect(getPostTradeShareSession()?.status).toBe('failed');
  });
});
