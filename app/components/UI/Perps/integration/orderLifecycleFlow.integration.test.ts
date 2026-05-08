/**
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

import { renderHook, act } from '@testing-library/react-native';

import { buildPerpsFlowHarness } from '../../../../../tests/integration/harnesses/perps-flow';
import { usePerpsTrading } from '../hooks/usePerpsTrading';

describe('Perps order lifecycle — FLOW integration', () => {
  describe('opening a position via the hook chain', () => {
    it('places a long market order through the real usePerpsTrading hook', async () => {
      // Arrange
      const { harness } = buildPerpsFlowHarness();
      harness.setupTradingReady();
      const { result } = renderHook(() => usePerpsTrading());

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
      expect(harness.mocks.exchangeClient.order).toHaveBeenCalledTimes(1);
      expect(harness.mocks.exchangeClient.order).toHaveBeenCalledWith(
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
  });

  /**
   * The full reverse-position flow that started this whole investigation.
   *
   * Chain exercised:
   *   renderHook(usePerpsTrading)
   *     → result.current.flipPosition({ position })
   *       → Engine.context.PerpsController.flipPosition (shim)
   *         → real TradingService.flipPosition
   *           → constructs OrderParams with size=2x, no currentPrice
   *           → real provider.placeOrder(orderParams)
   *             → real validateOrder
   *               → returns ORDER_PRICE_REQUIRED (production bug)
   *
   * Shape A could only catch the bug by calling `provider.validateOrder`
   * directly. Shape B catches it through the actual user-facing chain —
   * proving the TradingService → provider seam is genuinely covered.
   */
  describe('reversing a position via the hook chain (production bug)', () => {
    it('reproduces the ORDER_PRICE_REQUIRED bug end-to-end', async () => {
      // Arrange
      const { harness } = buildPerpsFlowHarness();
      harness.setupTradingReady();
      const openLongBTC = {
        coin: 'BTC',
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
      };
      const { result } = renderHook(() => usePerpsTrading());

      // Act — through the real hook → real TradingService → real provider chain
      let flipResult: Awaited<
        ReturnType<typeof result.current.flipPosition>
      > | null = null;
      await act(async () => {
        flipResult = await result.current.flipPosition({
          position: openLongBTC as never,
        });
      });

      // Assert — flipPosition returns a failed result with the right error
      // code. The bug is reachable because TradingService constructs the
      // OrderParams without `currentPrice`, and the real provider's
      // `validateOrder` rejects market orders without a price.
      expect(flipResult).not.toBeNull();
      expect(flipResult).toMatchObject({ success: false });
      expect((flipResult as { error: string }).error).toMatch(
        /ORDER_PRICE_REQUIRED/,
      );
      // SDK was never called — validation aborted the flow before placement.
      expect(harness.mocks.exchangeClient.order).not.toHaveBeenCalled();
    });
  });
});
