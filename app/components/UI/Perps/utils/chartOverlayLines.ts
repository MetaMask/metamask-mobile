import {
  getTriggerExecution,
  isLimitExecutionOrderType,
  type Order,
  type Position,
} from '@metamask/perps-controller';
import type {
  ChartLimitOrderLine,
  TPSLLines,
} from '../components/TradingViewChart/TradingViewChart';
import { getValidOrderPrice, isTriggerOrder } from './orderUtils';

export type { ChartLimitOrderLine };

/**
 * Resting book limits for chart overlays. Trigger TP/SL stay on the
 * position TP/SL lines and are excluded here.
 */
export function getChartLimitOrderLines(
  orders: Order[],
): ChartLimitOrderLine[] {
  const lines: ChartLimitOrderLine[] = [];

  for (const order of orders) {
    if (order.status !== undefined && order.status !== 'open') {
      continue;
    }
    if (order.isSynthetic) {
      continue;
    }
    if (isTriggerOrder(order)) {
      continue;
    }

    const isRestingLimit =
      isLimitExecutionOrderType(order.orderType) ||
      getTriggerExecution(order.orderType) === 'limit';
    if (!isRestingLimit) {
      continue;
    }

    const price = getValidOrderPrice(order);
    if (price === null) {
      continue;
    }

    lines.push({
      id: order.orderId,
      price: String(price),
      side: order.side === 'sell' ? 'sell' : 'buy',
    });
  }

  return lines;
}

export function buildChartOverlayLines({
  currentPrice,
  existingPosition,
  limitOrders,
}: {
  currentPrice?: string;
  existingPosition?: Position | null;
  limitOrders: ChartLimitOrderLine[];
}): TPSLLines | undefined {
  const overlay: TPSLLines = {};

  if (currentPrice) {
    overlay.currentPrice = currentPrice;
  }

  if (existingPosition) {
    overlay.entryPrice = existingPosition.entryPrice;
    overlay.takeProfitPrice = existingPosition.takeProfitPrice;
    overlay.stopLossPrice = existingPosition.stopLossPrice;
    if (existingPosition.liquidationPrice) {
      overlay.liquidationPrice = existingPosition.liquidationPrice;
    }
  }

  if (limitOrders.length > 0) {
    overlay.limitOrders = limitOrders;
  }

  if (
    overlay.currentPrice === undefined &&
    overlay.entryPrice === undefined &&
    overlay.limitOrders === undefined
  ) {
    return undefined;
  }

  return overlay;
}
