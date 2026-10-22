import { assetIdsMatch } from '@metamask/bridge-controller';
import { parseCaipAssetType } from '@metamask/utils';
import { MOCK_RECURRING_ORDERS } from './recurringOrders.mock';
import { MOCK_RECURRING_SWAPS_BY_ORDER_ID } from './recurringSwaps.mock';
import {
  RecurringOrderStatus,
  type GetRecurringOrdersByAssetQuery,
  type GetRecurringOrdersByAssetResponse,
  type GetRecurringOrdersQuery,
  type GetRecurringOrdersResponse,
  type GetRecurringSwapsQuery,
  type GetRecurringSwapsResponse,
} from './recurringOrders.types';

const DEFAULT_ORDERS_PAGE_LIMIT = 20;
const DEFAULT_SWAPS_PAGE_LIMIT = 20;
const MOCK_API_DELAY_MS = process.env.NODE_ENV === 'test' ? 0 : 500;
const cancelledOrderIds = new Set<string>();

export function resetRecurringOrdersMockState(): void {
  cancelledOrderIds.clear();
}

function getRecurringOrdersFromMockState() {
  return MOCK_RECURRING_ORDERS.map((order) =>
    cancelledOrderIds.has(order.orderId)
      ? { ...order, status: RecurringOrderStatus.Cancelled }
      : order,
  );
}

export async function cancelRecurringOrder(
  orderId: string,
  delayMs = MOCK_API_DELAY_MS,
): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));

  const order = MOCK_RECURRING_ORDERS.find(
    ({ orderId: candidateOrderId }) => candidateOrderId === orderId,
  );
  if (!order) {
    throw new Error('order_not_found');
  }

  const effectiveStatus = cancelledOrderIds.has(orderId)
    ? RecurringOrderStatus.Cancelled
    : order.status;
  if (effectiveStatus !== RecurringOrderStatus.Open) {
    throw new Error('order_not_open');
  }

  cancelledOrderIds.add(orderId);
}

// TODO: Replace this mock with the real GET /recurring/orders API.
export async function getRecurringOrders(
  query: GetRecurringOrdersQuery,
  delayMs = MOCK_API_DELAY_MS,
): Promise<GetRecurringOrdersResponse> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));

  const effectiveOrders = getRecurringOrdersFromMockState();
  const matchingOrders = effectiveOrders
    .filter((order) => {
      if (query.status && !query.status.includes(order.status)) {
        return false;
      }

      if (!query.chainId) {
        return true;
      }

      return (
        parseCaipAssetType(order.src.asset.assetId).chainId === query.chainId
      );
    })
    .sort(
      (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
    );

  const limit = query.limit ?? DEFAULT_ORDERS_PAGE_LIMIT;
  const pageStart = Number(query.cursor ?? 0);
  const orders = matchingOrders
    .slice(pageStart, pageStart + limit)
    .map((order) => ({
      ...order,
      src: { ...order.src, walletAddress: query.walletAddress },
      dest: { ...order.dest, walletAddress: query.walletAddress },
    }));
  const nextPageStart = pageStart + orders.length;

  return {
    orders,
    ...(nextPageStart < matchingOrders.length
      ? { nextCursor: String(nextPageStart) }
      : {}),
  };
}

// TODO: Replace this mock with the real asset-specific recurring orders API.
export async function getRecurringOrdersByAsset(
  query: GetRecurringOrdersByAssetQuery,
  delayMs = MOCK_API_DELAY_MS,
): Promise<GetRecurringOrdersByAssetResponse> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));

  return getRecurringOrdersFromMockState()
    .filter(
      (order) =>
        order.status === RecurringOrderStatus.Open &&
        (assetIdsMatch(order.src.asset.assetId, query.assetId) ||
          assetIdsMatch(order.dest.asset.assetId, query.assetId)),
    )
    .sort(
      (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
    )
    .slice(0, 1)
    .map((order) => ({
      ...order,
      src: { ...order.src, walletAddress: query.walletAddress },
      dest: { ...order.dest, walletAddress: query.walletAddress },
    }));
}

// TODO: Replace this mock with the real GET /recurring/orders/:orderId/swaps API.
export async function getRecurringSwaps(
  orderId: string,
  query: GetRecurringSwapsQuery = {},
  delayMs = MOCK_API_DELAY_MS,
): Promise<GetRecurringSwapsResponse> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));

  const orderSwaps = MOCK_RECURRING_SWAPS_BY_ORDER_ID[orderId];
  if (!orderSwaps) {
    throw new Error('order_not_found');
  }

  const matchingSwaps = [...orderSwaps].sort(
    (left, right) =>
      Date.parse(right.executedAt ?? right.scheduledAt) -
      Date.parse(left.executedAt ?? left.scheduledAt),
  );
  const limit = query.limit ?? DEFAULT_SWAPS_PAGE_LIMIT;
  const pageStart = Number(query.cursor ?? 0);
  const swaps = matchingSwaps.slice(pageStart, pageStart + limit);
  const nextPageStart = pageStart + swaps.length;

  return {
    swaps,
    ...(nextPageStart < matchingSwaps.length
      ? { nextCursor: String(nextPageStart) }
      : {}),
  };
}
