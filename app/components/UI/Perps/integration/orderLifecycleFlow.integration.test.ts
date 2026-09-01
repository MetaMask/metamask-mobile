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
 * Reference: tests/integration/harnesses/perps/perps-flow.ts
 *            tests/integration/STRATEGY.md (Shape A vs Shape B discussion)
 */

import { act, waitFor } from '@testing-library/react-native';

// The harness installs the controller boundary mocks before the controller
// entrypoint is evaluated.
import { buildPerpsFlowHarness } from '../../../../../tests/integration/harnesses/perps/perps-flow';
import {
  PERPS_ERROR_CODES,
  type OrderResult,
  type Position,
} from '@metamask/perps-controller';
import { HyperliquidError } from '@nktkas/hyperliquid';
// Mobile's current Node resolver cannot read this package export, while Jest
// and Metro resolve the SDK's declared `./api/exchange` entrypoint.
// @ts-expect-error The subpath is exported by @nktkas/hyperliquid.
import { ApiRequestError } from '@nktkas/hyperliquid/api/exchange';

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

    it('starts a TWAP through the hook, TradingService, and provider chain', async () => {
      const perps = buildPerpsFlowHarness();
      perps.harness.setupTradingReady();
      const { result } = perps.renderHookWithFlow(() => usePerpsTrading());

      let placeOrderResult: Awaited<
        ReturnType<typeof result.current.placeOrder>
      > | null = null;
      await act(async () => {
        placeOrderResult = await result.current.placeOrder({
          symbol: 'BTC',
          isBuy: true,
          size: '0.1',
          orderType: 'twap',
          currentPrice: 50_000,
          twapDuration: 90,
          twapRandomize: true,
        });
      });

      expect(placeOrderResult).toMatchObject({
        success: true,
        orderId: '123',
      });
      expect(perps.harness.mocks.exchangeClient.twapOrder).toHaveBeenCalledWith(
        {
          twap: {
            a: 0, // venue asset id
            b: true, // buy
            s: '0.1', // size
            r: false, // reduce only
            m: 90, // duration in minutes
            t: true, // randomize child sizes
          },
        },
      );
      expect(perps.harness.mocks.exchangeClient.order).not.toHaveBeenCalled();
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

    it('emits a partially_filled Perp Trade Transaction when the fill is partial', async () => {
      const perps = buildPerpsFlowHarness();
      perps.harness.setupTradingReady();
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

      await act(async () => {
        await result.current.placeOrder({
          symbol: 'BTC',
          isBuy: true,
          size: '0.1',
          orderType: 'market',
          currentPrice: 50_000,
        });
      });

      const events = perps.analytics.byName(
        PerpsAnalyticsEvent.TradeTransaction,
      );
      const partialEvent = events.find(
        (e) => e.status === PERPS_EVENT_VALUE.STATUS.PARTIALLY_FILLED,
      );
      expect(partialEvent).toMatchObject({
        status: PERPS_EVENT_VALUE.STATUS.PARTIALLY_FILLED,
        asset: 'BTC',
        order_size: 0.1,
        amount_filled: 0.05,
        remaining_amount: 0.05,
      });
    });

    it.each([
      {
        placement: 'full',
        statuses: [
          { resting: { oid: 101 } },
          { resting: { oid: 102 } },
          { resting: { oid: 103 } },
        ],
        childOrderIds: ['101', '102', '103'],
        submittedSize: '0.6',
        acceptedSize: '0.6',
        acceptedChildren: [
          { orderId: '101', state: 'resting' },
          { orderId: '102', state: 'resting' },
          { orderId: '103', state: 'resting' },
        ],
        submittedValue: 30_134,
        filledSize: undefined,
        averagePrice: undefined,
        resultOrderSize: 0.6,
        resultOrderValue: 30_134,
      },
      {
        placement: 'partial',
        statuses: [
          { resting: { oid: 101 } },
          { filled: { oid: 102, avgPx: '50000', totalSz: '0.2' } },
          { error: 'Insufficient margin' },
        ],
        childOrderIds: ['101'],
        submittedSize: '0.6',
        acceptedSize: '0.333',
        acceptedChildren: [
          { orderId: '101', state: 'resting' },
          { orderId: '102', state: 'filled' },
        ],
        submittedValue: 16_517,
        filledSize: '0.2',
        averagePrice: '50000',
        resultOrderSize: 0.2,
        resultOrderValue: 10_000,
      },
    ])(
      'reports $placement Scale submitted size and weighted telemetry',
      async ({
        placement,
        statuses,
        childOrderIds,
        submittedSize,
        acceptedSize,
        acceptedChildren,
        submittedValue,
        filledSize,
        averagePrice,
        resultOrderSize,
        resultOrderValue,
      }) => {
        // Arrange
        const perps = buildPerpsFlowHarness();
        perps.harness.setupTradingReady();
        const venueResponse = {
          status: 'ok',
          response: { type: 'order', data: { statuses } },
        } as const;
        if (placement === 'partial') {
          perps.harness.mocks.exchangeClient.order.mockRejectedValueOnce(
            new ApiRequestError(venueResponse, 'order 2: Insufficient margin'),
          );
        } else {
          perps.harness.mocks.exchangeClient.order.mockResolvedValueOnce(
            venueResponse,
          );
        }
        const { result } = perps.renderHookWithFlow(() => usePerpsTrading());

        // Act
        const placeOrderResultRef: { current: OrderResult | null } = {
          current: null,
        };
        await act(async () => {
          placeOrderResultRef.current = await result.current.placeOrder({
            symbol: 'BTC',
            isBuy: true,
            size: '0.6',
            orderType: 'scale',
            currentPrice: 50_000,
            scaleMinPrice: '49000',
            scaleMaxPrice: '51000',
            scaleNumOrders: 3,
            scaleSkew: 2,
          });
        });

        // Assert
        expect(placeOrderResultRef.current).toMatchObject({
          success: true,
          childOrderIds,
          submittedSize,
          acceptedSize,
          acceptedChildren,
        });
        expect(placeOrderResultRef.current?.filledSize).toBe(filledSize);
        expect(placeOrderResultRef.current?.averagePrice).toBe(averagePrice);
        expect(
          Number(placeOrderResultRef.current?.weightedAverageLimitPrice),
        ).toBeCloseTo(submittedValue / Number(acceptedSize));
        expect(
          perps.analytics.lastByName(PerpsAnalyticsEvent.TradeTransaction),
        ).toMatchObject({
          status: PERPS_EVENT_VALUE.STATUS.EXECUTED,
          asset: 'BTC',
          order_type: 'scale',
          order_size: resultOrderSize,
          limit_price: submittedValue / Number(acceptedSize),
          order_value: resultOrderValue,
        });
        if (filledSize) {
          const partialEvent = perps.analytics
            .byName(PerpsAnalyticsEvent.TradeTransaction)
            .find(
              (event) =>
                event.status === PERPS_EVENT_VALUE.STATUS.PARTIALLY_FILLED,
            );
          expect(partialEvent).toMatchObject({
            order_size: Number(acceptedSize),
            amount_filled: Number(filledSize),
            remaining_amount: Number(acceptedSize) - Number(filledSize),
            limit_price: submittedValue / Number(acceptedSize),
            order_value: submittedValue,
          });
        }
        expect(
          perps.harness.mocks.exchangeClient.cancel,
        ).not.toHaveBeenCalled();
      },
    );

    it.each(['resolved', 'thrown'] as const)(
      'rejects and cleans waiting Scale children from a %s venue response',
      async (responseKind) => {
        const perps = buildPerpsFlowHarness();
        perps.harness.setupTradingReady();
        const venueResponse = {
          status: 'ok' as const,
          response: {
            type: 'order' as const,
            data: {
              statuses: [
                'waitingForFill',
                'waitingForTrigger',
                { error: 'Insufficient margin' },
              ],
            },
          },
        };
        if (responseKind === 'thrown') {
          perps.harness.mocks.exchangeClient.order.mockRejectedValueOnce(
            new ApiRequestError(venueResponse, 'Insufficient margin'),
          );
        } else {
          perps.harness.mocks.exchangeClient.order.mockResolvedValueOnce(
            venueResponse,
          );
        }
        const { result } = perps.renderHookWithFlow(() => usePerpsTrading());

        let placeOrderResult: OrderResult | null = null;
        await act(async () => {
          placeOrderResult = await result.current.placeOrder({
            symbol: 'BTC',
            isBuy: true,
            size: '0.6',
            orderType: 'scale',
            currentPrice: 50_000,
            scaleMinPrice: '49000',
            scaleMaxPrice: '51000',
            scaleNumOrders: 3,
            scaleSkew: 2,
          });
        });

        expect(placeOrderResult).toMatchObject({
          success: false,
          childOrderIds: [],
          acceptedChildren: [
            { state: 'waitingForFill' },
            { state: 'waitingForTrigger' },
          ],
        });
        const submittedOrders =
          perps.harness.mocks.exchangeClient.order.mock.calls[0][0].orders;
        expect(
          perps.harness.mocks.exchangeClient.cancelByCloid,
        ).toHaveBeenCalledWith({
          cancels: [0, 1].map((index) => ({
            asset: 0,
            cloid: submittedOrders[index].c,
          })),
        });
        expect(
          perps.harness.mocks.exchangeClient.cancel,
        ).not.toHaveBeenCalled();
      },
    );

    it.each([
      {
        failure: 'unrelated SDK error',
        error: new HyperliquidError('SDK failure'),
        message: 'SDK failure',
        expectedCancels: undefined,
        expectedCloidIndexes: [] as number[],
      },
      {
        failure: 'unknown partial status',
        error: new ApiRequestError(
          {
            status: 'ok',
            response: {
              type: 'order',
              data: {
                statuses: [
                  { resting: { oid: 101 } },
                  { scheduled: { oid: 102 } },
                  { error: 'Insufficient margin' },
                ],
              },
            },
          },
          'Unknown bulk status',
        ),
        message: 'Unknown bulk status',
        expectedCancels: [{ a: 0, o: 101 }],
        expectedCloidIndexes: [1],
      },
      {
        failure: 'malformed partial status',
        error: new ApiRequestError(
          {
            status: 'ok',
            response: {
              type: 'order',
              data: {
                statuses: [
                  { resting: { oid: 101 } },
                  { filled: { oid: '102' } },
                  { error: 'Insufficient margin' },
                ],
              },
            },
          },
          'Malformed bulk status',
        ),
        message: 'Malformed bulk status',
        expectedCancels: [{ a: 0, o: 101 }],
        expectedCloidIndexes: [1],
      },
      {
        failure: 'hybrid partial response',
        error: new ApiRequestError(
          {
            status: 'ok',
            response: {
              type: 'order',
              data: {
                statuses: [
                  { resting: { oid: 101 } },
                  { error: 'Insufficient margin' },
                  {
                    resting: { oid: 103 },
                    error: 'Invalid status',
                  },
                ],
              },
            },
          },
          'Hybrid bulk response',
        ),
        message: 'Hybrid bulk response',
        expectedCancels: [{ a: 0, o: 101 }],
        expectedCloidIndexes: [2],
      },
      {
        failure: 'all-rejected partial response',
        error: new ApiRequestError(
          {
            status: 'ok',
            response: {
              type: 'order',
              data: {
                statuses: [
                  { error: 'Multi-sig required' },
                  { error: 'Multi-sig required' },
                  { error: 'Multi-sig required' },
                ],
              },
            },
          },
          'order 0: Multi-sig required',
        ),
        message: PERPS_ERROR_CODES.EXCHANGE_MULTI_SIG_REQUIRED,
        expectedCancels: undefined,
        expectedCloidIndexes: [] as number[],
      },
    ])(
      'preserves failure behavior for a $failure',
      async ({ error, message, expectedCancels, expectedCloidIndexes }) => {
        // Arrange
        const perps = buildPerpsFlowHarness();
        perps.harness.setupTradingReady();
        perps.harness.mocks.exchangeClient.order.mockRejectedValueOnce(error);
        const { result } = perps.renderHookWithFlow(() => usePerpsTrading());

        // Act
        let placeOrderResult: OrderResult | null = null;
        await act(async () => {
          placeOrderResult = await result.current.placeOrder({
            symbol: 'BTC',
            isBuy: true,
            size: '0.6',
            orderType: 'scale',
            currentPrice: 50_000,
            scaleMinPrice: '49000',
            scaleMaxPrice: '51000',
            scaleNumOrders: 3,
            scaleSkew: 2,
          });
        });

        // Assert
        expect(placeOrderResult).toMatchObject({
          success: false,
          error: message,
        });
        if (expectedCancels) {
          expect(
            perps.harness.mocks.exchangeClient.cancel,
          ).toHaveBeenCalledWith({ cancels: expectedCancels });
        } else {
          expect(
            perps.harness.mocks.exchangeClient.cancel,
          ).not.toHaveBeenCalled();
        }
        if (expectedCloidIndexes.length > 0) {
          const submittedOrders =
            perps.harness.mocks.exchangeClient.order.mock.calls[0][0].orders;
          expect(
            perps.harness.mocks.exchangeClient.cancelByCloid,
          ).toHaveBeenCalledWith({
            cancels: expectedCloidIndexes.map((index) => ({
              asset: 0,
              cloid: submittedOrders[index].c,
            })),
          });
        } else {
          expect(
            perps.harness.mocks.exchangeClient.cancelByCloid,
          ).not.toHaveBeenCalled();
        }
      },
    );

    it('rejects a Scale ladder when the venue accepts no children', async () => {
      // Arrange
      const perps = buildPerpsFlowHarness();
      perps.harness.setupTradingReady();
      perps.harness.mocks.exchangeClient.order.mockResolvedValueOnce({
        status: 'ok',
        response: {
          data: {
            statuses: [
              { error: 'Insufficient margin' },
              { error: 'Insufficient margin' },
              { error: 'Insufficient margin' },
            ],
          },
        },
      });
      const { result } = perps.renderHookWithFlow(() => usePerpsTrading());

      // Act
      const placeOrderResultRef: { current: OrderResult | null } = {
        current: null,
      };
      await act(async () => {
        placeOrderResultRef.current = await result.current.placeOrder({
          symbol: 'BTC',
          isBuy: true,
          size: '0.6',
          orderType: 'scale',
          currentPrice: 50_000,
          scaleMinPrice: '49000',
          scaleMaxPrice: '51000',
          scaleNumOrders: 3,
          scaleSkew: 2,
        });
      });

      // Assert
      expect(placeOrderResultRef.current).toMatchObject({ success: false });
      expect(placeOrderResultRef.current?.childOrderIds).toBeUndefined();
      expect(perps.harness.mocks.exchangeClient.cancel).not.toHaveBeenCalled();
      expect(
        perps.analytics.lastByName(PerpsAnalyticsEvent.TradeTransaction),
      ).toMatchObject({
        status: PERPS_EVENT_VALUE.STATUS.FAILED,
        asset: 'BTC',
        order_type: 'scale',
      });
    });

    it.each([
      {
        responseShape: 'truncated status array',
        statuses: [{ resting: { oid: 101 } }],
        expectedCancels: [{ a: 0, o: 101 }],
        expectedCloidIndexes: [1, 2],
        expectedChildOrderIds: [],
      },
      {
        responseShape: 'malformed status payload',
        statuses: { resting: { oid: 101 } },
        expectedCancels: null,
        expectedCloidIndexes: [0, 1, 2],
        expectedChildOrderIds: undefined,
      },
      {
        responseShape: 'unknown status entry',
        statuses: [
          { resting: { oid: 101 } },
          { scheduled: { oid: 102 } },
          { error: 'Insufficient margin' },
        ],
        expectedCancels: [{ a: 0, o: 101 }],
        expectedCloidIndexes: [1],
        expectedChildOrderIds: [],
        cancelStatuses: ['success'],
      },
      {
        responseShape: 'malformed status entry',
        statuses: [
          { resting: { oid: 101 } },
          { filled: { oid: '102' } },
          { error: 'Insufficient margin' },
        ],
        expectedCancels: [{ a: 0, o: 101 }],
        expectedCloidIndexes: [1],
        expectedChildOrderIds: [],
      },
      {
        responseShape: 'hybrid accepted and error status entry',
        statuses: [
          { resting: { oid: 101 } },
          { error: 'Insufficient margin' },
          { resting: { oid: 103 }, error: 'Invalid status' },
        ],
        expectedCancels: [{ a: 0, o: 101 }],
        expectedCloidIndexes: [2],
        expectedChildOrderIds: [],
      },
      {
        responseShape: 'all-hybrid accepted and error status entries',
        statuses: [
          { resting: { oid: 101 }, error: 'Invalid status' },
          { resting: { oid: 102 }, error: 'Invalid status' },
          { filled: { oid: 103 }, error: 'Invalid status' },
        ],
        expectedCancels: null,
        expectedCloidIndexes: [0, 1, 2],
        expectedChildOrderIds: undefined,
      },
    ])(
      'rejects and cleans up a Scale ladder with a $responseShape',
      async ({
        statuses,
        expectedCancels,
        expectedCloidIndexes,
        expectedChildOrderIds,
        cancelStatuses,
      }) => {
        // Arrange
        const perps = buildPerpsFlowHarness();
        perps.harness.setupTradingReady();
        perps.harness.mocks.exchangeClient.order.mockResolvedValueOnce({
          status: 'ok',
          response: { data: { statuses } },
        });
        if (cancelStatuses) {
          perps.harness.mocks.exchangeClient.cancel.mockResolvedValueOnce({
            status: 'ok',
            response: { data: { statuses: cancelStatuses } },
          });
        }
        const { result } = perps.renderHookWithFlow(() => usePerpsTrading());

        // Act
        const placeOrderResultRef: { current: OrderResult | null } = {
          current: null,
        };
        await act(async () => {
          placeOrderResultRef.current = await result.current.placeOrder({
            symbol: 'BTC',
            isBuy: true,
            size: '0.6',
            orderType: 'scale',
            currentPrice: 50_000,
            scaleMinPrice: '49000',
            scaleMaxPrice: '51000',
            scaleNumOrders: 3,
            scaleSkew: 2,
          });
        });

        // Assert
        expect(placeOrderResultRef.current).toMatchObject({ success: false });
        expect(placeOrderResultRef.current?.childOrderIds).toEqual(
          expectedChildOrderIds,
        );
        const submittedOrders =
          perps.harness.mocks.exchangeClient.order.mock.calls[0][0].orders;
        expect(
          perps.harness.mocks.exchangeClient.cancelByCloid,
        ).toHaveBeenCalledWith({
          cancels: expectedCloidIndexes.map((index) => ({
            asset: 0,
            cloid: submittedOrders[index].c,
          })),
        });
        if (expectedCancels) {
          expect(
            perps.harness.mocks.exchangeClient.cancel,
          ).toHaveBeenCalledWith({ cancels: expectedCancels });
        } else {
          expect(
            perps.harness.mocks.exchangeClient.cancel,
          ).not.toHaveBeenCalled();
        }
      },
    );

    it('rejects and cleans up a Scale ladder when the top-level result is non-ok', async () => {
      // Arrange
      const perps = buildPerpsFlowHarness();
      perps.harness.setupTradingReady();
      perps.harness.mocks.exchangeClient.order.mockResolvedValueOnce({
        status: 'err',
        response: {
          data: {
            statuses: [
              { resting: { oid: 101 } },
              { resting: { oid: 102 } },
              { resting: { oid: 103 } },
            ],
          },
        },
      });
      perps.harness.mocks.exchangeClient.cancel.mockResolvedValueOnce({
        status: 'ok',
        response: {
          data: { statuses: ['success', 'success', 'success'] },
        },
      });
      const { result } = perps.renderHookWithFlow(() => usePerpsTrading());

      // Act
      const placeOrderResultRef: { current: OrderResult | null } = {
        current: null,
      };
      await act(async () => {
        placeOrderResultRef.current = await result.current.placeOrder({
          symbol: 'BTC',
          isBuy: true,
          size: '0.6',
          orderType: 'scale',
          currentPrice: 50_000,
          scaleMinPrice: '49000',
          scaleMaxPrice: '51000',
          scaleNumOrders: 3,
          scaleSkew: 2,
        });
      });

      // Assert
      expect(placeOrderResultRef.current).toMatchObject({ success: false });
      expect(placeOrderResultRef.current?.childOrderIds).toEqual([]);
      expect(perps.harness.mocks.exchangeClient.cancel).toHaveBeenCalledWith({
        cancels: [
          { a: 0, o: 101 },
          { a: 0, o: 102 },
          { a: 0, o: 103 },
        ],
      });
    });

    it('rejects and cleans up a Scale ladder whose placement outlives the provider lifecycle', async () => {
      // Arrange
      const perps = buildPerpsFlowHarness();
      perps.harness.setupTradingReady();
      const venueResult = {
        status: 'ok',
        response: {
          data: {
            statuses: [
              { resting: { oid: 101 } },
              { resting: { oid: 102 } },
              { resting: { oid: 103 } },
            ],
          },
        },
      };
      let resolveOrder: ((value: typeof venueResult) => void) | undefined;
      perps.harness.mocks.exchangeClient.order.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveOrder = resolve;
          }),
      );
      perps.harness.mocks.exchangeClient.cancel.mockResolvedValueOnce({
        status: 'ok',
        response: {
          data: { statuses: ['success', 'success', 'success'] },
        },
      });

      // Act
      const placement = perps.harness.provider.placeOrder({
        symbol: 'BTC',
        isBuy: true,
        size: '0.6',
        orderType: 'scale',
        currentPrice: 50_000,
        scaleMinPrice: '49000',
        scaleMaxPrice: '51000',
        scaleNumOrders: 3,
        scaleSkew: 2,
      });
      await waitFor(() =>
        expect(perps.harness.mocks.exchangeClient.order).toHaveBeenCalledTimes(
          1,
        ),
      );
      await perps.harness.provider.disconnect();
      if (!resolveOrder) {
        throw new Error('Scale order submission did not start');
      }
      resolveOrder(venueResult);
      const placeOrderResult = await placement;

      // Assert
      expect(placeOrderResult).toMatchObject({
        success: false,
        error: 'PROVIDER_LIFECYCLE_STALE',
      });
      expect(placeOrderResult.childOrderIds).toEqual([]);
      expect(perps.harness.mocks.exchangeClient.cancel).toHaveBeenCalledWith({
        cancels: [
          { a: 0, o: 101 },
          { a: 0, o: 102 },
          { a: 0, o: 103 },
        ],
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
