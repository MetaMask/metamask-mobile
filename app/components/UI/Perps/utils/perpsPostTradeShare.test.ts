import {
  beginPerpsPostTradeShare,
  buildPerpsClosePostTradePreview,
  canBeginPerpsPostTradeShare,
  canPromptPerpsPostTrade,
  completePerpsPostTradeShare,
  failPerpsPostTradeShare,
  isPerpsPostTradeShareEligible,
  openPerpsPostTradeShareSession,
  withPerpsFillPrice,
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
      canShare: true,
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
      canShare: true,
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
      canShare: true,
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

  it('keeps a copy-trade from an account that cannot post on the normal toast path', () => {
    const sessionId = beginPerpsPostTradeShare({
      canShare: false,
      copyTradeOrigin,
      orderType: 'market',
      activeProvider: 'hyperliquid',
      asset: 'ETH',
      direction: 'long',
      leverage: 10,
      amountUsd: '400',
    });

    expect(sessionId).toBeUndefined();
    expect(getPostTradeShareSession()).toBeNull();
  });

  it('completes a pending session with the order id', () => {
    const sessionId = beginPerpsPostTradeShare({
      canShare: true,
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
      canShare: true,
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
      canShare: true,
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
      canShare: true,
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

  describe('close share', () => {
    const closePreview = () =>
      buildPerpsClosePostTradePreview({
        asset: 'ETH',
        direction: 'short',
        leverage: 5,
        amountUsd: '500',
        entryPrice: '3000',
        pnlUsd: -25,
        pnlPercent: -12.5,
      });

    it('builds a close preview with the realized PnL', () => {
      const preview = closePreview();

      expect(preview).toEqual(
        expect.objectContaining({
          product: 'perps',
          action: 'close',
          tradeSymbol: 'ETH',
          direction: 'short',
          leverageLabel: '5x',
          isPnlPositive: false,
        }),
      );
      expect(preview.costLabel).toBeDefined();
      expect(preview.entryPriceLabel).toBeDefined();
      expect(preview.pnlLabel).toContain('12.5');
      expect(preview.pnlValueLabel).toMatch(/^-/);
      expect(preview.exitPriceLabel).toBeUndefined();
    });

    it('leaves the PnL off a close preview without a realized PnL', () => {
      const preview = buildPerpsClosePostTradePreview({
        asset: 'ETH',
        direction: 'long',
      });

      expect(preview.action).toBe('close');
      expect(preview.pnlLabel).toBeUndefined();
      expect(preview.pnlValueLabel).toBeUndefined();
      expect(preview.isPnlPositive).toBeUndefined();
    });

    it('opens a pending close session with the close pair label', () => {
      openPerpsPostTradeShareSession({
        asset: 'ETH',
        direction: 'short',
        preview: closePreview(),
      });

      expect(getPostTradeShareSession()).toEqual(
        expect.objectContaining({
          product: 'perps',
          status: 'pending',
          pairLabel: 'Close 5x Short ETH',
          preview: expect.objectContaining({ action: 'close' }),
        }),
      );
    });

    it('writes the fill price as the exit price when a close completes', () => {
      const sessionId = openPerpsPostTradeShareSession({
        asset: 'ETH',
        direction: 'short',
        preview: closePreview(),
      });
      const entryPriceLabel = closePreview().entryPriceLabel;

      completePerpsPostTradeShare(sessionId, {
        orderId: '7',
        entryPrice: '2800',
      });

      const session = getPostTradeShareSession();
      if (session?.product !== 'perps') {
        throw new Error('expected a perps session');
      }
      expect(session.preview.exitPriceLabel).toBeDefined();
      expect(session.preview.exitPriceLabel).not.toBe(entryPriceLabel);
      expect(session.preview.entryPriceLabel).toBe(entryPriceLabel);
    });
  });

  describe('withPerpsFillPrice', () => {
    const openPreview = {
      product: 'perps' as const,
      tokenSymbol: 'ETH',
      tradeSymbol: 'ETH',
      tokenAddress: 'ETH',
      direction: 'long' as const,
    };

    it('sets the entry price of an open', () => {
      const preview = withPerpsFillPrice(openPreview, '3200');

      expect(preview.entryPriceLabel).toBeDefined();
      expect(preview.exitPriceLabel).toBeUndefined();
    });

    it('sets the exit price of a close', () => {
      const preview = withPerpsFillPrice(
        { ...openPreview, action: 'close' },
        '3200',
      );

      expect(preview.exitPriceLabel).toBeDefined();
      expect(preview.entryPriceLabel).toBeUndefined();
    });

    it('keeps the preview when the fill price is unusable', () => {
      expect(withPerpsFillPrice(openPreview, undefined)).toBe(openPreview);
      expect(withPerpsFillPrice(openPreview, '0')).toBe(openPreview);
    });
  });
});
