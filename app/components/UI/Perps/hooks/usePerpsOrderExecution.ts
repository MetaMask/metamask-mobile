import { useCallback, useState } from 'react';
import { strings } from '../../../../../locales/i18n';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { TraceName, TraceOperation } from '../../../../util/trace';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import Logger from '../../../../util/Logger';
import { ensureError } from '../../../../util/errorUtils';
import {
  PERPS_CONSTANTS,
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
  type OrderParams,
  type OrderResult,
  type Position,
} from '@metamask/perps-controller';
import { usePerpsEventTracking } from './usePerpsEventTracking';
import { usePerpsMeasurement } from './usePerpsMeasurement';
import { usePerpsTrading } from './usePerpsTrading';
import {
  startPerpsCufTrace,
  endPerpsCufTrace,
  endPerpsCufTraceAfter,
  armPerpsPlaceOrderCuf,
  isPerpsPlaceOrderCufCurrent,
  isPerpsFillRendered,
  waitForPerpsPlaceOrderPositionRendered,
  watchPerpsCufLimitRendered,
} from '../utils/perpsCufTrace';
import {
  PERPS_CUF_TAG,
  PERPS_CUF_END_REASON,
  PERPS_CUF_BOUNDARY,
  PERPS_CUF_STREAM_TIMEOUT_MS,
  PERPS_CUF_STREAM_CONFIRM_RACE_MS,
} from '../constants/perpsCufTags';
import { usePerpsStream } from '../providers/PerpsStreamManager';
import { getPerpsChartAnalyticsPropertiesForLibrary } from '../utils/analytics/chartInstrumentation';

interface PerpsChartTrackingData {
  chartLibrary?: string;
}

interface UsePerpsOrderExecutionParams {
  /** Called when the order has been successfully submitted to the exchange. */
  onSubmitted?: () => void;
  /** Called when the position has rendered via the stream (or, on stream timeout, without it). */
  onSuccess?: (position?: Position) => void;
  onError?: (error: string) => void;
}

interface UsePerpsOrderExecutionReturn {
  placeOrder: (params: OrderParams) => Promise<void>;
  isPlacing: boolean;
  lastResult?: OrderResult;
  error?: string;
}

type PerpsOrderTrackingValue = string | number | boolean;
type PerpsOrderPositionSnapshot = Pick<Position, 'size'>;

const getPerpsOrderPositionSnapshot = (
  position?: PerpsOrderPositionSnapshot | null,
) => (position ? position.size : undefined);

/**
 * Hook to handle order execution flow
 * Manages loading states, success/error handling, and stream-confirmed
 * position rendering
 */
export function usePerpsOrderExecution(
  params: UsePerpsOrderExecutionParams = {},
): UsePerpsOrderExecutionReturn {
  const { onSubmitted, onSuccess, onError } = params;
  const { placeOrder: controllerPlaceOrder } = usePerpsTrading();
  const { track } = usePerpsEventTracking();
  const stream = usePerpsStream();

  const [isPlacing, setIsPlacing] = useState(false);
  const [lastResult, setLastResult] = useState<OrderResult>();
  const [error, setError] = useState<string>();

  // Track order submission toast with unified measurement hook
  usePerpsMeasurement({
    traceName: TraceName.PerpsOrderSubmissionToast,
    op: TraceOperation.PerpsOrderSubmission,
    startConditions: [isPlacing], // Start when placing begins
    endConditions: [!!lastResult || !!error], // End when we have result or error
    resetConditions: [!isPlacing], // Reset when not placing
  });

  const placeOrder = useCallback(
    async (orderParams: OrderParams) => {
      // Market orders measure submit -> position rendered (toast coupled to the
      // same stream render) via PerpsPlaceOrderToPositionRendered. Limit orders
      // measure submit -> resting order rendered in the orders stream (no
      // exchange fill-wait time) via PerpsPlaceLimitOrderToOrderRendered. Each
      // start mints a unique op id so overlapping orders never collide.
      // Only an explicit limit order takes the order-render path; anything else
      // (including an omitted orderType) is treated as market.
      const isMarketOrder = orderParams.orderType !== 'limit';
      const cufOpId = startPerpsCufTrace({
        name: isMarketOrder
          ? TraceName.PerpsPlaceOrderToPositionRendered
          : TraceName.PerpsPlaceLimitOrderToOrderRendered,
        tags: {
          [PERPS_CUF_TAG.DIRECTION]: orderParams.isBuy
            ? PERPS_EVENT_VALUE.DIRECTION.LONG
            : PERPS_EVENT_VALUE.DIRECTION.SHORT,
          [PERPS_CUF_TAG.ORDER_TYPE]: orderParams.orderType,
        },
      });
      const endCuf = (data: Record<string, PerpsOrderTrackingValue>) =>
        endPerpsCufTrace({ id: cufOpId, data });
      const endCufRendered = (renderedAt: number, toastShownAt: number) =>
        // End at the captured stream render instant, not when this code runs,
        // so the span measures gesture -> actual position render.
        endPerpsCufTrace({
          id: cufOpId,
          data: {
            [PERPS_CUF_TAG.SUCCESS]: true,
            [PERPS_CUF_TAG.BOUNDARY]: PERPS_CUF_BOUNDARY.STREAM,
            [PERPS_CUF_TAG.TOAST_POSITION_DELTA_MS]: renderedAt - toastShownAt,
          },
          timestamp: renderedAt,
        });
      // Limit fast-path end: the confirming order/fill was already present in the
      // stream cache when we checked, so end at the channel's last delivery
      // instant rather than now (falls back to now if unavailable).
      const endCufStreamRendered = (renderedAt: number | null) =>
        endPerpsCufTrace({
          id: cufOpId,
          data: {
            [PERPS_CUF_TAG.SUCCESS]: true,
            [PERPS_CUF_TAG.BOUNDARY]: PERPS_CUF_BOUNDARY.STREAM,
          },
          timestamp: renderedAt ?? undefined,
        });
      // Baseline lets stream matchers tell this order's fill apart from a
      // position that already existed on this market before submission. A null
      // cache means "not loaded", not "no position" — pass that through so the
      // matcher captures the baseline from the first delivery instead of
      // assuming absent (which a pre-existing position would falsely satisfy).
      // We deliberately do NOT block order submission on a REST fetch to
      // resolve an unloaded cache: the fetch would add latency to every
      // cold-start trade. The only residual is a rare cold-start order whose
      // fill lands in that very first delivery — it records a stream_timeout
      // rather than a render duration, which does not corrupt data or affect
      // the user's flow.
      const positionsCache = stream.positions.getSnapshot();
      const positionsLoaded = positionsCache !== null;
      const positionBaseline =
        positionsCache?.find((p) => p.symbol === orderParams.symbol) ?? null;
      const positionBaselineSnapshot =
        getPerpsOrderPositionSnapshot(positionBaseline);
      if (isMarketOrder) {
        armPerpsPlaceOrderCuf(
          cufOpId,
          orderParams.symbol,
          positionBaseline,
          positionsLoaded,
        );
      }

      // Safety watchdog anchored at the gesture: if the controller never
      // returns (a hung request), none of the per-flow ends run, so this closes
      // the span. Once the controller settles, stream-specific waits own the
      // timeout window and this watchdog must not race them.
      let controllerSettled = false;
      setTimeout(() => {
        if (!controllerSettled) {
          // Distinct from stream_timeout: the controller request itself never
          // settled, rather than a settled request whose render never arrived.
          endCuf({
            [PERPS_CUF_TAG.SUCCESS]: false,
            [PERPS_CUF_TAG.REASON]: PERPS_CUF_END_REASON.CONTROLLER_TIMEOUT,
          });
        }
      }, PERPS_CUF_STREAM_TIMEOUT_MS);

      const chartLibrary = (
        orderParams.trackingData as PerpsChartTrackingData | undefined
      )?.chartLibrary;
      const chartAnalyticsProperties = chartLibrary
        ? getPerpsChartAnalyticsPropertiesForLibrary(chartLibrary)
        : undefined;

      try {
        setIsPlacing(true);
        setError(undefined);
        setLastResult(undefined);

        DevLogger.log(
          'usePerpsOrderExecution: Placing order',
          JSON.stringify(orderParams, null, 2),
        );

        onSubmitted?.();

        const result = await controllerPlaceOrder(orderParams);
        controllerSettled = true;
        setLastResult(result);

        if (result.success) {
          DevLogger.log(
            'usePerpsOrderExecution: Order placed successfully',
            result,
          );

          // Check if order was partially filled
          const orderSize = Number.parseFloat(orderParams.size.toString());
          const filledSize = result.filledSize
            ? Number.parseFloat(result.filledSize)
            : orderSize;
          const isPartiallyFilled = filledSize > 0 && filledSize < orderSize;

          if (isPartiallyFilled) {
            // Track partially filled event
            const partialProps: Record<string, string | number | boolean> = {
              [PERPS_EVENT_PROPERTY.STATUS]:
                PERPS_EVENT_VALUE.STATUS.PARTIALLY_FILLED,
              [PERPS_EVENT_PROPERTY.ASSET]: orderParams.symbol,
              [PERPS_EVENT_PROPERTY.DIRECTION]: orderParams.isBuy
                ? PERPS_EVENT_VALUE.DIRECTION.LONG
                : PERPS_EVENT_VALUE.DIRECTION.SHORT,
              [PERPS_EVENT_PROPERTY.LEVERAGE]: orderParams.leverage || 1,
              [PERPS_EVENT_PROPERTY.ORDER_SIZE]: orderSize,
              [PERPS_EVENT_PROPERTY.ORDER_TYPE]: orderParams.orderType,
              [PERPS_EVENT_PROPERTY.AMOUNT_FILLED]: filledSize,
              [PERPS_EVENT_PROPERTY.REMAINING_AMOUNT]: orderSize - filledSize,
              [PERPS_EVENT_PROPERTY.TRADE_WITH_TOKEN]:
                orderParams.trackingData?.tradeWithToken === true,
            };
            if (orderParams.trackingData?.source) {
              partialProps[PERPS_EVENT_PROPERTY.SOURCE] =
                orderParams.trackingData.source;
            }
            if (chartAnalyticsProperties) {
              Object.assign(partialProps, chartAnalyticsProperties);
            }
            if (orderParams.trackingData?.tradeWithToken === true) {
              if (orderParams.trackingData.mmPayTokenSelected != null) {
                partialProps[PERPS_EVENT_PROPERTY.MM_PAY_TOKEN_SELECTED] =
                  orderParams.trackingData.mmPayTokenSelected;
              }
              if (orderParams.trackingData.mmPayNetworkSelected != null) {
                partialProps[PERPS_EVENT_PROPERTY.MM_PAY_NETWORK_SELECTED] =
                  orderParams.trackingData.mmPayNetworkSelected;
              }
            } else if (orderParams.trackingData !== undefined) {
              partialProps[PERPS_EVENT_PROPERTY.MM_PAY_TOKEN_SELECTED] =
                PERPS_EVENT_VALUE.MM_PAY_TOKEN.PERPS_BALANCE;
            }
            track(MetaMetricsEvents.PERPS_TRADE_TRANSACTION, partialProps);
          }

          if (!isMarketOrder) {
            // Resting limit order: accepted, no position renders now. Confirm
            // immediately, then end the order-render CUF when the resting
            // order appears in the stream (or on timeout).
            onSuccess?.();
            const orderId = result.orderId;
            if (typeof orderId !== 'string') {
              endCuf({
                [PERPS_CUF_TAG.SUCCESS]: false,
                [PERPS_CUF_TAG.REASON]: PERPS_CUF_END_REASON.REQUEST_FAILED,
              });
            } else if (
              stream.orders.getSnapshot()?.some((o) => o.orderId === orderId)
            ) {
              // Already rested between submit and here: end at the delivery
              // instant, not now.
              endCufStreamRendered(stream.orders.getLastDeliveredAt());
            } else {
              // End when the order rests in the orders stream, or — for a
              // marketable limit that fills immediately — when it renders as a
              // new/changed position (baseline tells a fill from a prior hold).
              const renderedPosition = stream.positions
                .getSnapshot()
                ?.find((p) => p.symbol === orderParams.symbol);
              // A synchronous fill is a position that appeared/changed versus the
              // baseline, OR a pre-existing position now absent because the fill
              // reduced it fully to zero (a marketable limit that closed the
              // hold). Delegates to the same predicate the stream matcher uses,
              // so the fast path and the matcher cannot drift. Only trusted with
              // a loaded baseline; otherwise defer to the stream matcher.
              const filledSynchronously =
                positionsLoaded &&
                isPerpsFillRendered(renderedPosition, positionBaselineSnapshot);
              if (filledSynchronously) {
                // Fill already rendered before the watcher armed: end at the
                // positions channel's last-delivery instant. This is channel-
                // granular (positions re-deliver on any PnL tick), so it upper-
                // bounds this symbol's fill instant rather than pinpointing it —
                // bounded and never optimistic. Rare branch; the normal path
                // (watcher observes the live delivery) is exact.
                endCufStreamRendered(stream.positions.getLastDeliveredAt());
              } else {
                watchPerpsCufLimitRendered(
                  cufOpId,
                  orderId,
                  orderParams.symbol,
                  positionBaseline,
                  positionsLoaded,
                );
                endPerpsCufTraceAfter(
                  {
                    id: cufOpId,
                    data: {
                      [PERPS_CUF_TAG.SUCCESS]: false,
                      [PERPS_CUF_TAG.REASON]:
                        PERPS_CUF_END_REASON.STREAM_TIMEOUT,
                    },
                  },
                  PERPS_CUF_STREAM_TIMEOUT_MS,
                );
              }
            }
          } else {
            // Wait briefly for the stream to render the new/changed position so
            // the confirmation toast fires together with it.
            const rendered = await waitForPerpsPlaceOrderPositionRendered(
              PERPS_CUF_STREAM_CONFIRM_RACE_MS,
              cufOpId,
            );
            const toastShownAt = Date.now();
            if (rendered) {
              endCufRendered(rendered.renderedAt, toastShownAt);
              const position = stream.positions
                .getSnapshot()
                ?.find((p) => p.symbol === orderParams.symbol);
              DevLogger.log(
                'usePerpsOrderExecution: Position rendered by stream',
                rendered.position,
              );
              onSuccess?.(position);
            } else {
              // Stream quiet: unblock the toast now, end the span when the
              // position finally renders (or record the miss on timeout).
              DevLogger.log(
                'usePerpsOrderExecution: Position not rendered yet, toasting without it',
              );
              onSuccess?.();
              // Deliberately not awaited: the caller must not block on the span.
              waitForPerpsPlaceOrderPositionRendered(
                PERPS_CUF_STREAM_TIMEOUT_MS,
                cufOpId,
              ).then((late) => {
                // A newer order owns the span now; this continuation is stale.
                if (!isPerpsPlaceOrderCufCurrent(cufOpId)) {
                  return;
                }
                if (late) {
                  endCufRendered(late.renderedAt, toastShownAt);
                } else {
                  endCuf({
                    [PERPS_CUF_TAG.SUCCESS]: false,
                    [PERPS_CUF_TAG.REASON]: PERPS_CUF_END_REASON.STREAM_TIMEOUT,
                  });
                }
              });
            }
          }
        } else {
          const errorMessage =
            result.error || strings('perps.order.error.unknown');
          endCuf({
            [PERPS_CUF_TAG.SUCCESS]: false,
            [PERPS_CUF_TAG.REASON]: PERPS_CUF_END_REASON.ORDER_FAILED,
          });
          setError(errorMessage);
          DevLogger.log('usePerpsOrderExecution: Order failed', errorMessage);

          // Track order failure with specific event
          const failedProps: Record<string, string | number | boolean> = {
            [PERPS_EVENT_PROPERTY.STATUS]: PERPS_EVENT_VALUE.STATUS.FAILED,
            [PERPS_EVENT_PROPERTY.ASSET]: orderParams.symbol,
            [PERPS_EVENT_PROPERTY.DIRECTION]: orderParams.isBuy
              ? PERPS_EVENT_VALUE.DIRECTION.LONG
              : PERPS_EVENT_VALUE.DIRECTION.SHORT,
            [PERPS_EVENT_PROPERTY.ORDER_TYPE]: orderParams.orderType,
            [PERPS_EVENT_PROPERTY.ORDER_SIZE]: orderParams.size,
            [PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: errorMessage,
            [PERPS_EVENT_PROPERTY.TRADE_WITH_TOKEN]:
              orderParams.trackingData?.tradeWithToken === true,
          };
          if (orderParams.trackingData?.source) {
            failedProps[PERPS_EVENT_PROPERTY.SOURCE] =
              orderParams.trackingData.source;
          }
          if (chartAnalyticsProperties) {
            Object.assign(failedProps, chartAnalyticsProperties);
          }
          if (orderParams.trackingData?.tradeWithToken === true) {
            if (orderParams.trackingData.mmPayTokenSelected != null) {
              failedProps[PERPS_EVENT_PROPERTY.MM_PAY_TOKEN_SELECTED] =
                orderParams.trackingData.mmPayTokenSelected;
            }
            if (orderParams.trackingData.mmPayNetworkSelected != null) {
              failedProps[PERPS_EVENT_PROPERTY.MM_PAY_NETWORK_SELECTED] =
                orderParams.trackingData.mmPayNetworkSelected;
            }
          } else if (orderParams.trackingData !== undefined) {
            failedProps[PERPS_EVENT_PROPERTY.MM_PAY_TOKEN_SELECTED] =
              PERPS_EVENT_VALUE.MM_PAY_TOKEN.PERPS_BALANCE;
          }
          track(MetaMetricsEvents.PERPS_TRADE_TRANSACTION, failedProps);

          onError?.(errorMessage);
        }
      } catch (err) {
        controllerSettled = true;
        endCuf({
          [PERPS_CUF_TAG.SUCCESS]: false,
          [PERPS_CUF_TAG.REASON]: PERPS_CUF_END_REASON.EXCEPTION,
        });
        const errorObject = ensureError(
          err,
          'usePerpsOrderExecution.placeOrder',
        );
        const errorMessage =
          err instanceof Error
            ? err.message
            : strings('perps.order.error.unknown');
        setError(errorMessage);
        DevLogger.log('usePerpsOrderExecution: Error placing order', err);

        Logger.error(errorObject, {
          tags: {
            feature: PERPS_CONSTANTS.FeatureName,
            component: 'usePerpsOrderExecution',
            action: 'order_creation',
            operation: 'order_management',
          },
          context: {
            name: 'usePerpsOrderExecution',
            data: {
              symbol: orderParams.symbol,
              isBuy: orderParams.isBuy,
              orderType: orderParams.orderType,
              size: orderParams.size,
              price: orderParams.price,
              leverage: orderParams.leverage,
              takeProfitPrice: orderParams.takeProfitPrice,
              stopLossPrice: orderParams.stopLossPrice,
            },
          },
        });

        // Track exception with specific event
        const exceptionProps: Record<string, string | number | boolean> = {
          [PERPS_EVENT_PROPERTY.STATUS]: PERPS_EVENT_VALUE.STATUS.FAILED,
          [PERPS_EVENT_PROPERTY.ASSET]: orderParams.symbol,
          [PERPS_EVENT_PROPERTY.DIRECTION]: orderParams.isBuy
            ? PERPS_EVENT_VALUE.DIRECTION.LONG
            : PERPS_EVENT_VALUE.DIRECTION.SHORT,
          [PERPS_EVENT_PROPERTY.ORDER_TYPE]: orderParams.orderType,
          [PERPS_EVENT_PROPERTY.ORDER_SIZE]: orderParams.size,
          [PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: errorMessage,
          [PERPS_EVENT_PROPERTY.TRADE_WITH_TOKEN]:
            orderParams.trackingData?.tradeWithToken === true,
        };
        if (orderParams.trackingData?.source) {
          exceptionProps[PERPS_EVENT_PROPERTY.SOURCE] =
            orderParams.trackingData.source;
        }
        if (chartAnalyticsProperties) {
          Object.assign(exceptionProps, chartAnalyticsProperties);
        }
        if (orderParams.trackingData?.tradeWithToken === true) {
          if (orderParams.trackingData.mmPayTokenSelected != null) {
            exceptionProps[PERPS_EVENT_PROPERTY.MM_PAY_TOKEN_SELECTED] =
              orderParams.trackingData.mmPayTokenSelected;
          }
          if (orderParams.trackingData.mmPayNetworkSelected != null) {
            exceptionProps[PERPS_EVENT_PROPERTY.MM_PAY_NETWORK_SELECTED] =
              orderParams.trackingData.mmPayNetworkSelected;
          }
        } else if (orderParams.trackingData !== undefined) {
          exceptionProps[PERPS_EVENT_PROPERTY.MM_PAY_TOKEN_SELECTED] =
            PERPS_EVENT_VALUE.MM_PAY_TOKEN.PERPS_BALANCE;
        }
        track(MetaMetricsEvents.PERPS_TRADE_TRANSACTION, exceptionProps);

        onError?.(errorMessage);
      } finally {
        setIsPlacing(false);
      }
    },
    [controllerPlaceOrder, stream, onSubmitted, onSuccess, onError, track],
  );

  return {
    placeOrder,
    isPlacing,
    lastResult,
    error,
  };
}
