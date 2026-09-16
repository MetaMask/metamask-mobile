import { parseCaipAssetType } from '@metamask/utils';
import { MOCK_RECURRING_ORDERS } from './recurringOrders.mock';
import type {
  GetRecurringOrdersQuery,
  GetRecurringOrdersResponse,
} from './recurringOrders.types';

const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 50;
const MOCK_API_DELAY_MS = process.env.NODE_ENV === 'test' ? 0 : 500;

// TODO: Replace this mock with the real GET /recurring/orders API.
export async function getRecurringOrders(
  query: GetRecurringOrdersQuery,
  delayMs = MOCK_API_DELAY_MS,
): Promise<GetRecurringOrdersResponse> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));

  const matchingOrders = MOCK_RECURRING_ORDERS.filter((order) => {
    if (query.status && !query.status.includes(order.status)) {
      return false;
    }

    if (!query.chainId) {
      return true;
    }

    return (
      parseCaipAssetType(order.src.asset.assetId).chainId === query.chainId
    );
  }).sort(
    (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
  );

  const limit = Math.min(query.limit ?? DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT);
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
