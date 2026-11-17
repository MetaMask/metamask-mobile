import {
  beginPerpsPostTradeShare,
  buildPerpsPostTradePreview,
  canBeginPerpsPostTradeShare,
  canPromptPerpsPostTrade,
  completePerpsPostTradeShare,
  failPerpsPostTradeShare,
  isPerpsPostTradeShareEligible,
  openPerpsPostTradeShareSession,
} from './perpsPostTradeShare';
import { MIN_POST_TRADE_SHARE_USD } from '../../../../util/social/postTradeShareThreshold';
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
    it('returns false when position size is below the minimum', () => {
      const result = isPerpsPostTradeShareEligible({ amountUsd: '9.99' });

      expect(result).toBe(false);
    });

    it('returns true at the minimum position size', () => {
      const result = isPerpsPostTradeShareEligible({
        amountUsd: String(MIN_POST_TRADE_SHARE_USD),
      });

      expect(result).toBe(true);
    });

    it('returns true for a $50 position at 10x even though margin is $5', () => {
      const result = isPerpsPostTradeShareEligible({ amountUsd: '50' });

      expect(result).toBe(true);
    });

    it('returns false when position size is missing', () => {
      const result = isPerpsPostTradeShareEligible({});

      expect(result).toBe(false);
    });

    it('returns false when position size is not a number', () => {
      const result = isPerpsPostTradeShareEligible({ amountUsd: 'abc' });

      expect(result).toBe(false);
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
      canPromptPerpsPostTrade({
        orderType: 'market',
        activeProvider: 'lighter',
      }),
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

  it('keeps a leveraged copy-trade on the toast path when position size is below the minimum', () => {
    const sessionId = beginPerpsPostTradeShare({
      copyTradeOrigin,
      orderType: 'market',
      activeProvider: 'hyperliquid',
      asset: 'ETH',
      direction: 'long',
      leverage: 10,
      amountUsd: '9',
    });

    expect(sessionId).toBeUndefined();
    expect(getPostTradeShareSession()).toBeNull();
  });

  it('opens a share for a leveraged copy-trade at the minimum position size', () => {
    const sessionId = beginPerpsPostTradeShare({
      copyTradeOrigin,
      orderType: 'market',
      activeProvider: 'hyperliquid',
      asset: 'ETH',
      direction: 'long',
      leverage: 10,
      amountUsd: String(MIN_POST_TRADE_SHARE_USD),
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
      amountUsd: '400',
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
      leverage: 1,
      amountUsd: '100',
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

  describe('executed cost', () => {
    it('takes the cost from the fill: filled size times average price', () => {
      const preview = buildPerpsPostTradePreview({
        asset: 'ETH',
        direction: 'long',
        leverage: 1,
        amountUsd: '11',
        entryPrice: '1815',
        filledSize: '0.0061',
      });

      expect(preview.costLabel).toBe('$11.07');
      expect(preview.entryPriceLabel).toBe('$1,815');
    });

    it('uses the same fill cost for a short', () => {
      const preview = buildPerpsPostTradePreview({
        asset: 'ETH',
        direction: 'short',
        leverage: 1,
        amountUsd: '11',
        entryPrice: '1815',
        filledSize: '0.0061',
      });

      expect(preview.direction).toBe('short');
      expect(preview.costLabel).toBe('$11.07');
    });

    it('falls back to the typed amount when the result has no fill size', () => {
      const preview = buildPerpsPostTradePreview({
        asset: 'ETH',
        direction: 'long',
        amountUsd: '11',
        entryPrice: '1815',
      });

      expect(preview.costLabel).toBe('$11.00');
    });

    it('replaces the pending typed cost with the fill when the order completes', () => {
      const sessionId = openPerpsPostTradeShareSession({
        asset: 'ETH',
        direction: 'long',
        leverage: 1,
        amountUsd: '11',
      });
      expect(getPostTradeShareSession()?.preview.costLabel).toBe('$11.00');

      completePerpsPostTradeShare(sessionId, {
        orderId: '42',
        entryPrice: '1815',
        filledSize: '0.0061',
      });

      expect(getPostTradeShareSession()?.preview.costLabel).toBe('$11.07');
      expect(getPostTradeShareSession()?.preview.entryPriceLabel).toBe(
        '$1,815',
      );
    });

    it('keeps the typed cost when the completed order has no fill size', () => {
      const sessionId = openPerpsPostTradeShareSession({
        asset: 'ETH',
        direction: 'long',
        leverage: 1,
        amountUsd: '11',
      });

      completePerpsPostTradeShare(sessionId, {
        orderId: '42',
        entryPrice: '1815',
      });

      expect(getPostTradeShareSession()?.preview.costLabel).toBe('$11.00');
      expect(getPostTradeShareSession()?.preview.entryPriceLabel).toBe(
        '$1,815',
      );
    });
  });
});
