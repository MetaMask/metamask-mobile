/*
 * Integration tests — perps order lifecycle, FLOW SHAPE (Option 2).
 *
 * Side-by-side counterpart to `orderLifecycle.integration.test.ts`. That
 * file calls the provider directly; this one renders the real
 * `usePerpsTrading` hook and exercises the full chain:
 *
 *   renderHook(usePerpsTrading)
 *     → result.current.placeOrder(...)
 *       → Engine.context.PerpsController.placeOrder
 *         → (shim) → real HyperLiquidProvider.placeOrder
 *           → real validateOrder
 *             → mocked SDK exchange.order
 *
 * Catches the wiring between hook and controller in addition to the
 * controller wiring itself. Heavier setup, broader coverage.
 *
 * Reference: tests/integration/harnesses/perps-flow.ts
 *            tests/integration/STRATEGY.md (Shape A vs Shape B discussion)
 */

import { act } from '@testing-library/react-native';
import { type OrderResult, type Position } from '@metamask/perps-controller';

import { buildPerpsFlowHarness } from '../../../../../tests/integration/harnesses/perps-flow';
import { usePerpsTrading } from '../hooks/usePerpsTrading';
import { PerpsAnalyticsEvent } from '@metamask/perps-controller/types';
import { PERPS_EVENT_VALUE } from '@metamask/perps-controller/constants/eventNames';

describe('Perps order lifecycle — FLOW integration', () => {
  describe('opening a position via the hook chain', () => {
    it('places a long market order through the real usePerpsTrading hook', async () => {
      // Arrange
      const perps = buildPerpsFlowHarness();
      perps.harness.setupTradingReady();
      const { result } = perps.renderHookWithFlow(() => usePerpsTrading());

      // Act
      let placeOrderResult: Awaited<
        ReturnType<typeof result.current.placeOrder>
      > | null = null;
      await act(async () => {
        placeOrderResult = await result.current.placeOrder({
          symbol: 'BTC',
          isBuy: true,
          size: '0.1',
          orderType: 'market',
          currentPrice: 50_000,
        });
      });

      // Assert — hook returned success AND the SDK at the bottom of the
      // chain was called. Both ends of the chain verified in one test.
      expect(placeOrderResult).not.toBeNull();
      expect(placeOrderResult).toMatchObject({ success: true, orderId: '123' });
      expect(perps.harness.mocks.exchangeClient.order).toHaveBeenCalledTimes(1);
      expect(perps.harness.mocks.exchangeClient.order).toHaveBeenCalledWith(
        expect.objectContaining({
          orders: [
            expect.objectContaining({
              a: 0,
              b: true,
              t: { limit: { tif: 'FrontendMarket' } },
            }),
          ],
        }),
      );
    });

    it('emits Perp Trade Transaction with status executed on a successful market open', async () => {
      const perps = buildPerpsFlowHarness();
      perps.harness.setupTradingReady();
      perps.harness.mocks.exchangeClient.order.mockResolvedValueOnce({
        status: 'ok',
        response: {
          data: {
            statuses: [
              { filled: { oid: 123, totalSz: '0.1', avgPx: '50000' } },
            ],
          },
        },
      });
      const { result } = perps.renderHookWithFlow(() => usePerpsTrading());

      await act(async () => {
        await result.current.placeOrder({
          symbol: 'BTC',
          isBuy: true,
          size: '0.1',
          orderType: 'market',
          currentPrice: 50_000,
          trackingData: {
            totalFee: 5,
            marketPrice: 50_000,
            source: 'perp_asset_screen',
            tradeAction: 'create_position',
          },
        });
      });

      const tradeEvent = perps.analytics.lastByName(
        PerpsAnalyticsEvent.TradeTransaction,
      );
      expect(tradeEvent).toMatchObject({
        status: PERPS_EVENT_VALUE.STATUS.EXECUTED,
        asset: 'BTC',
        direction: PERPS_EVENT_VALUE.DIRECTION.LONG,
        order_type: 'market',
        order_size: 0.1,
        order_value: 5000,
        fees: 5,
        source: 'perp_asset_screen',
        action: 'create_position',
      });
    });

    it('emits Perp Trade Transaction with status failed when the provider rejects the order', async () => {
      const perps = buildPerpsFlowHarness();
      perps.harness.setupTradingReady();
      perps.harness.mocks.exchangeClient.order.mockResolvedValueOnce({
        status: 'err',
        response: 'Insufficient margin',
      });
      const { result } = perps.renderHookWithFlow(() => usePerpsTrading());

      await act(async () => {
        await result.current.placeOrder({
          symbol: 'BTC',
          isBuy: true,
          size: '0.1',
          orderType: 'market',
          currentPrice: 50_000,
        });
      });

      const tradeEvent = perps.analytics.lastByName(
        PerpsAnalyticsEvent.TradeTransaction,
      );
      expect(tradeEvent).toMatchObject({
        status: PERPS_EVENT_VALUE.STATUS.FAILED,
        asset: 'BTC',
      });
    });
  });

  /*
   * The full reverse-position flow that started this whole investigation.
   *
   * Chain exercised:
   *   renderHook(usePerpsTrading)
   *     → result.current.flipPosition({ position })
   *       → Engine.context.PerpsController.flipPosition (shim)
   *         → real TradingService.flipPosition
   *           → constructs OrderParams with size=2x
   *           → real provider.placeOrder(orderParams)
   *             → fetches live price for validation
   *             → mocked SDK exchange.order
   *
   * Shape B catches the actual user-facing chain, proving the
   * TradingService → provider seam is genuinely covered.
   */
  describe('reversing a position via the hook chain', () => {
    it('places the flip market order end-to-end', async () => {
      // Arrange
      const perps = buildPerpsFlowHarness();
      perps.harness.setupTradingReady();
      const openLongBTC: Position = {
        symbol: 'BTC',
        size: '0.1', // positive = long; flipPosition will compute 2x = 0.2
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
      const { result } = perps.renderHookWithFlow(() => usePerpsTrading());

      // Act — through the real hook → real TradingService → real provider chain
      let flipResult: OrderResult | null = null;
      await act(async () => {
        flipResult = await result.current.flipPosition({
          symbol: 'BTC',
          position: openLongBTC,
        });
      });

      // Assert — flipPosition succeeds because the provider fetches the
      // current market price before running order validation.
      expect(flipResult).not.toBeNull();
      if (!flipResult) {
        throw new Error('Expected flipPosition to return a result');
      }
      expect(flipResult).toMatchObject({ success: true });
      expect(perps.harness.mocks.exchangeClient.order).toHaveBeenCalledTimes(1);
      expect(perps.harness.mocks.exchangeClient.order).toHaveBeenCalledWith(
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
  });

  describe('closing a position via the hook chain', () => {
    const openLongBTC: Position = {
      symbol: 'BTC',
      size: '0.1', // positive = long
      entryPrice: '50000',
      positionValue: '5000',
      unrealizedPnl: '250',
      marginUsed: '500',
      leverage: { type: 'cross', value: 10 },
      liquidationPrice: '45000',
      maxLeverage: 50,
      returnOnEquity: '0.5',
      cumulativeFunding: { allTime: '0', sinceOpen: '0', sinceChange: '0' },
      takeProfitCount: 0,
      stopLossCount: 0,
    };

    it('emits Perp Position Close Transaction with status executed on a successful full close', async () => {
      const perps = buildPerpsFlowHarness();
      perps.harness.setupTradingReady();
      perps.harness.mocks.subscription.getCachedPositions.mockReturnValue([
        openLongBTC,
      ]);
      const { result } = perps.renderHookWithFlow(() => usePerpsTrading());

      let closeResult: OrderResult | null = null;
      await act(async () => {
        closeResult = await result.current.closePosition({
          symbol: 'BTC',
          orderType: 'market',
          currentPrice: 50_000,
          trackingData: {
            totalFee: 5,
            marketPrice: 50_000,
            source: 'position_screen',
          },
        });
      });

      expect(closeResult).toMatchObject({ success: true });

      const closeEvent = perps.analytics.lastByName(
        PerpsAnalyticsEvent.PositionCloseTransaction,
      );
      expect(closeEvent).toMatchObject({
        status: PERPS_EVENT_VALUE.STATUS.EXECUTED,
        asset: 'BTC',
        order_type: 'market',
        close_type: PERPS_EVENT_VALUE.CLOSE_TYPE.FULL,
        open_position_size: 0.1,
        percentage_closed: 100,
        dollar_pnl: 250,
        percent_pnl: 50,
        leverage: 10,
        fee: 5,
        source: 'position_screen',
      });
    });

    it('emits Perp Position Close Transaction with status failed when the provider rejects the close', async () => {
      const perps = buildPerpsFlowHarness();
      perps.harness.setupTradingReady();
      perps.harness.mocks.subscription.getCachedPositions.mockReturnValue([
        openLongBTC,
      ]);
      perps.harness.mocks.exchangeClient.order.mockResolvedValueOnce({
        status: 'err',
        response: 'Insufficient margin',
      });
      const { result } = perps.renderHookWithFlow(() => usePerpsTrading());

      let closeResult: OrderResult | null = null;
      await act(async () => {
        closeResult = await result.current.closePosition({
          symbol: 'BTC',
          orderType: 'market',
          currentPrice: 50_000,
        });
      });

      expect(closeResult).toMatchObject({ success: false });

      const closeEvent = perps.analytics.lastByName(
        PerpsAnalyticsEvent.PositionCloseTransaction,
      );
      expect(closeEvent).toMatchObject({
        status: PERPS_EVENT_VALUE.STATUS.FAILED,
        asset: 'BTC',
      });
    });

    it('emits a partially_filled Perp Position Close Transaction when the fill is partial', async () => {
      const perps = buildPerpsFlowHarness();
      perps.harness.setupTradingReady();
      perps.harness.mocks.subscription.getCachedPositions.mockReturnValue([
        openLongBTC,
      ]);
      perps.harness.mocks.exchangeClient.order.mockResolvedValueOnce({
        status: 'ok',
        response: {
          data: {
            statuses: [
              { filled: { oid: 123, totalSz: '0.05', avgPx: '50000' } },
            ],
          },
        },
      });
      const { result } = perps.renderHookWithFlow(() => usePerpsTrading());

      let closeResult: OrderResult | null = null;
      await act(async () => {
        closeResult = await result.current.closePosition({
          symbol: 'BTC',
          size: '0.1',
          orderType: 'market',
          currentPrice: 50_000,
        });
      });

      expect(closeResult).toMatchObject({ success: true });

      const events = perps.analytics.byName(
        PerpsAnalyticsEvent.PositionCloseTransaction,
      );
      const partialEvent = events.find(
        (e) => e.status === PERPS_EVENT_VALUE.STATUS.PARTIALLY_FILLED,
      );
      expect(partialEvent).toMatchObject({
        status: PERPS_EVENT_VALUE.STATUS.PARTIALLY_FILLED,
        asset: 'BTC',
        amount_filled: 0.05,
        remaining_amount: 0.05,
      });
    });
  });
});
