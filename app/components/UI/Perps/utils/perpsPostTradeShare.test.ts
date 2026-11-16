import {
  beginPerpsPostTradeShare,
  buildPerpsClosePostTradePreview,
  canBeginPerpsPostTradeShare,
  canPromptPerpsPostTrade,
  completePerpsPostTradeShare,
  failPerpsPostTradeShare,
  isPerpsPostTradeShareEligible,
  openPerpsPostTradeShareSession,
  withPerpsCloseFill,
} from './perpsPostTradeShare';
import { MIN_POST_TRADE_SHARE_USD } from '../../../../util/social/postTradeShareThreshold';
import {
  formatPercent,
  formatSignedUsd,
} from '../../SocialFeed/utils/formatters';
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
      });

    it('builds a close preview without exit price or PnL before the fill', () => {
      const preview = closePreview();

      expect(preview).toEqual(
        expect.objectContaining({
          product: 'perps',
          action: 'close',
          tradeSymbol: 'ETH',
          direction: 'short',
          leverageLabel: '5x',
        }),
      );
      expect(preview.costLabel).toBeDefined();
      expect(preview.entryPriceLabel).toBeDefined();
      expect(preview.exitPriceLabel).toBeUndefined();
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

    it('stores the filled preview when a close completes', () => {
      const sessionId = openPerpsPostTradeShareSession({
        asset: 'ETH',
        direction: 'short',
        preview: closePreview(),
      });
      const filledPreview = {
        ...closePreview(),
        exitPriceLabel: '$2,800',
        pnlValueLabel: '+$20.00',
      };

      completePerpsPostTradeShare(sessionId, {
        orderId: '7',
        preview: filledPreview,
      });

      const session = getPostTradeShareSession();
      if (session?.product !== 'perps') {
        throw new Error('expected a perps session');
      }
      expect(session.status).toBe('complete');
      expect(session.preview).toEqual(filledPreview);
    });
  });

  describe('withPerpsCloseFill', () => {
    const longPreview = () =>
      buildPerpsClosePostTradePreview({
        asset: 'BTC',
        direction: 'long',
        amountUsd: '50100',
        entryPrice: '50000',
      });
    // One BTC long entered at $50,000 and quoted at $50,100 before submit.
    const isolatedLong = {
      size: '1',
      entryPrice: '50000',
      marginUsed: '10100',
      unrealizedPnl: '100',
      leverage: { type: 'isolated' as const },
    };

    it('derives the PnL from a fill that crosses the entry price', () => {
      const preview = withPerpsCloseFill(longPreview(), {
        position: isolatedLong,
        providerId: 'hyperliquid',
        averagePrice: '49990',
        filledSize: '1',
      });

      expect(preview.exitPriceLabel).toBeDefined();
      expect(preview.pnlValueLabel).toBe(formatSignedUsd(-10));
      expect(preview.pnlLabel).toBe(formatPercent(-0.1));
      expect(preview.isPnlPositive).toBe(false);
    });

    it('uses the filled size when the close fills partially', () => {
      const preview = withPerpsCloseFill(longPreview(), {
        position: isolatedLong,
        providerId: 'hyperliquid',
        averagePrice: '50100',
        filledSize: '0.5',
      });

      expect(preview.pnlValueLabel).toBe(formatSignedUsd(50));
      expect(preview.pnlLabel).toBe(formatPercent(1));
    });

    it('prices the whole short position when the fill size is missing', () => {
      const preview = withPerpsCloseFill(longPreview(), {
        position: { ...isolatedLong, size: '-1' },
        providerId: 'hyperliquid',
        averagePrice: '49000',
        filledSize: undefined,
      });

      expect(preview.pnlValueLabel).toBe(formatSignedUsd(1000));
      expect(preview.isPnlPositive).toBe(true);
    });

    it.each([
      {
        mode: 'isolated' as const,
        marginUsed: '150',
        expectedPercent: 50,
      },
      {
        mode: 'cross' as const,
        marginUsed: '100',
        expectedPercent: 50,
      },
    ])(
      'measures the return on the $100 backing $50 of profit under $mode margin',
      ({ mode, marginUsed, expectedPercent }) => {
        const preview = withPerpsCloseFill(longPreview(), {
          position: {
            size: '1',
            entryPrice: '1000',
            marginUsed,
            unrealizedPnl: '50',
            leverage: { type: mode },
          },
          providerId: 'hyperliquid',
          averagePrice: '1050',
          filledSize: '1',
        });

        expect(preview.pnlValueLabel).toBe(formatSignedUsd(50));
        expect(preview.pnlLabel).toBe(formatPercent(expectedPercent));
      },
    );

    it('omits the percentage when the backing margin is unknown', () => {
      const preview = withPerpsCloseFill(longPreview(), {
        position: isolatedLong,
        providerId: 'lighter',
        averagePrice: '50100',
        filledSize: '1',
      });

      expect(preview.pnlValueLabel).toBe(formatSignedUsd(100));
      expect(preview.pnlLabel).toBeUndefined();
    });

    it('keeps the preview without exit or PnL when the fill price is unusable', () => {
      const preview = longPreview();

      expect(
        withPerpsCloseFill(preview, {
          position: isolatedLong,
          providerId: 'hyperliquid',
          averagePrice: undefined,
          filledSize: '1',
        }),
      ).toBe(preview);
      expect(
        withPerpsCloseFill(preview, {
          position: isolatedLong,
          providerId: 'hyperliquid',
          averagePrice: '0',
          filledSize: '1',
        }),
      ).toBe(preview);
    });
  });
});
