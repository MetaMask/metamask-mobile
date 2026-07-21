/**
 * Integration tests — perps order lifecycle (open / open-limit / close).
 *
 * Phase 1 of the perps integration rollout. Each test covers one row of the
 * order-lifecycle section of `tests/integration/perps-use-cases.md`. Real
 * `HyperLiquidProvider` runs; only the I/O boundary (SDK clients, wallet,
 * subscriptions) is mocked via the harness.
 *
 * Reference: tests/integration/AGENTS.md · .agents/skills/integration-test/
 */

import { type Position } from '@metamask/perps-controller';

import { buildPerpsIntegrationHarness } from '../../../../../tests/integration/harnesses/perps';

describe('Perps order lifecycle — integration', () => {
  describe('opening a position', () => {
    it('opens a long market order', async () => {
      // Arrange
      const { provider, setupTradingReady, mocks } =
        buildPerpsIntegrationHarness();
      setupTradingReady();

      // Act
      const result = await provider.placeOrder({
        symbol: 'BTC',
        isBuy: true,
        size: '0.1',
        orderType: 'market',
        currentPrice: 50_000,
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.orderId).toBe('123');
      expect(mocks.exchangeClient.order).toHaveBeenCalledWith(
        expect.objectContaining({
          orders: [
            expect.objectContaining({
              a: 0, // BTC asset id
              b: true, // isBuy
              t: { limit: { tif: 'FrontendMarket' } },
            }),
          ],
        }),
      );
    });

    it('opens a short market order', async () => {
      // Arrange
      const { provider, setupTradingReady, mocks } =
        buildPerpsIntegrationHarness();
      setupTradingReady();

      // Act
      const result = await provider.placeOrder({
        symbol: 'BTC',
        isBuy: false,
        size: '0.1',
        orderType: 'market',
        currentPrice: 50_000,
      });

      // Assert
      expect(result.success).toBe(true);
      expect(mocks.exchangeClient.order).toHaveBeenCalledWith(
        expect.objectContaining({
          orders: [
            expect.objectContaining({
              a: 0,
              b: false,
              t: { limit: { tif: 'FrontendMarket' } },
            }),
          ],
        }),
      );
    });

    it('opens a long limit order at the given price', async () => {
      // Arrange
      const { provider, setupTradingReady, mocks } =
        buildPerpsIntegrationHarness();
      setupTradingReady();

      // Act
      const result = await provider.placeOrder({
        symbol: 'BTC',
        isBuy: true,
        size: '0.1',
        orderType: 'limit',
        price: '49000',
      });

      // Assert
      expect(result.success).toBe(true);
      expect(mocks.exchangeClient.order).toHaveBeenCalledWith(
        expect.objectContaining({
          orders: [
            expect.objectContaining({
              a: 0,
              b: true,
              t: { limit: { tif: 'Gtc' } },
            }),
          ],
        }),
      );
    });
  });

  describe('closing a position', () => {
    /** Long BTC position seeded into the subscription cache. */
    const openLongBTC: Position = {
      symbol: 'BTC',
      size: '0.1', // positive = long
      entryPrice: '50000',
      positionValue: '5000',
      unrealizedPnl: '0',
      marginUsed: '500',
      leverage: { type: 'cross', value: 10 },
      liquidationPrice: '45000',
      maxLeverage: 50,
      returnOnEquity: '0',
      cumulativeFunding: { allTime: '0', sinceOpen: '0', sinceChange: '0' },
      takeProfitCount: 0,
      stopLossCount: 0,
    };

    it('closes a long position fully when size is omitted (cache-lookup path)', async () => {
      // Arrange
      const { provider, setupTradingReady, mocks } =
        buildPerpsIntegrationHarness();
      setupTradingReady();
      // Realistic flow: provider reads the position from the WS subscription
      // cache rather than receiving it inline from the UI.
      mocks.subscription.getCachedPositions.mockReturnValue([openLongBTC]);

      // Act — full close, no `size`, no `position` param
      const result = await provider.closePosition({
        symbol: 'BTC',
        orderType: 'market',
        currentPrice: 50_000,
      });

      // Assert — both the result AND the SDK call shape, since either alone
      // can pass for the wrong reason. orderId from the harness's default
      // exchange-client mock is '123'.
      expect(result.success).toBe(true);
      expect(result.orderId).toBe('123');
      expect(mocks.exchangeClient.order).toHaveBeenCalledTimes(1);
      expect(mocks.exchangeClient.order).toHaveBeenCalledWith(
        expect.objectContaining({
          orders: [
            expect.objectContaining({
              a: 0, // BTC asset id
              b: false, // closing a long → sell
              r: true, // reduceOnly
              s: '0.1', // full size of the position
            }),
          ],
        }),
      );
    });
  });
});
