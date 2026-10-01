import {
  assetIdsMatch,
  BridgeClientId,
  getClientHeaders,
} from '@metamask/bridge-controller';
import {
  isCaipAssetType,
  KnownCaipNamespace,
  parseCaipAssetType,
  toCaipAccountId,
} from '@metamask/utils';
import Engine from '../../../../core/Engine';
import { BRIDGE_API_BASE_URL } from '../../../../constants/bridge';
import { getBaseSemVerVersion } from '../../../../util/version';
import {
  MOCK_RECURRING_OPEN_ORDER,
  MOCK_RECURRING_ORDERS,
} from './recurringOrders.mock';
import { MOCK_RECURRING_SWAPS_BY_ORDER_ID } from './recurringSwaps.mock';
import {
  RecurringOrderState,
  type CancelRecurringOrderResponse,
  type CreateRecurringOrderRequest,
  type CreateRecurringOrderResponse,
  type GetRecurringOrdersByAssetQuery,
  type GetRecurringOrdersByAssetResponse,
  type GetRecurringOrdersQuery,
  type GetRecurringOrdersResponse,
  type GetRecurringSwapsQuery,
  type GetRecurringSwapsResponse,
  type RecurringApiError,
  type RecurringApiErrorCode,
  type RecurringOrder,
} from './recurringOrders.types';
import {
  parseCancelRecurringOrderResponse,
  parseCreateRecurringOrderResponse,
  parseGetRecurringOrdersResponse,
  parseGetRecurringSwapsResponse,
  parseRecurringApiError,
} from './recurringOrders.validators';

const RECURRING_ORDERS_PATH = '/v2/orders/recurring';
const DEFAULT_ORDERS_PAGE_LIMIT = 20;
const DEFAULT_SWAPS_PAGE_LIMIT = 50;
const MOCK_API_DELAY_MS = process.env.NODE_ENV === 'test' ? 0 : 500;
const IS_RECURRING_ORDERS_API_ENABLED = false;
const cancelledOrderIds = new Set<string>();

export class RecurringApiRequestError extends Error {
  readonly code: RecurringApiErrorCode;
  readonly details?: Record<string, unknown>;
  readonly status: number;

  constructor(status: number, error: RecurringApiError) {
    super(error.message);
    this.name = 'RecurringApiRequestError';
    this.status = status;
    this.code = error.code;
    this.details = error.details;
  }
}

async function getRecurringHeaders(includeContentType = false) {
  const bearerToken =
    await Engine.context.AuthenticationController.getBearerToken();

  return {
    ...(includeContentType ? { 'Content-Type': 'application/json' } : {}),
    ...getClientHeaders({
      clientId: BridgeClientId.MOBILE,
      clientVersion: getBaseSemVerVersion(),
      jwt: bearerToken ?? '',
    }),
  };
}

async function throwRecurringApiRequestError(
  response: Response,
  operation: string,
): Promise<never> {
  try {
    const error = parseRecurringApiError(await response.json());
    throw new RecurringApiRequestError(response.status, error);
  } catch (requestError) {
    if (requestError instanceof RecurringApiRequestError) {
      throw requestError;
    }
  }

  throw new Error(
    `${operation}: Request failed with status ${response.status}`,
  );
}

function getRecurringOrdersUrl(path = ''): string {
  return `${BRIDGE_API_BASE_URL.replace(
    /\/+$/u,
    '',
  )}${RECURRING_ORDERS_PATH}${path}`;
}

function recurringAssetIdsMatch(left: string, right: string): boolean {
  return (
    isCaipAssetType(left) &&
    isCaipAssetType(right) &&
    assetIdsMatch(left, right)
  );
}

export function resetRecurringOrdersMockState(): void {
  cancelledOrderIds.clear();
}

function getRecurringOrdersFromMockState(
  walletAddress?: string,
): RecurringOrder[] {
  return MOCK_RECURRING_ORDERS.map((order) => ({
    ...order,
    ...(walletAddress
      ? {
          account: toCaipAccountId(
            KnownCaipNamespace.Eip155,
            '1',
            walletAddress,
          ),
        }
      : {}),
    ...(cancelledOrderIds.has(order.id)
      ? { state: RecurringOrderState.Cancelled }
      : {}),
  }));
}

export async function cancelRecurringOrder(
  orderId: string,
  accountAddress: string,
  delayMs = MOCK_API_DELAY_MS,
): Promise<CancelRecurringOrderResponse> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));

  const order = getRecurringOrdersFromMockState().find(
    ({ id }) => id === orderId,
  );
  if (!order) {
    throw new Error('order_not_found');
  }
  if (order.state !== RecurringOrderState.Open) {
    throw new Error('order_not_cancellable');
  }

  cancelledOrderIds.add(orderId);
  return parseCancelRecurringOrderResponse({
    order: {
      ...order,
      account: accountAddress,
      state: RecurringOrderState.Cancelled,
    },
  });
}

export async function getRecurringOrders(
  query: GetRecurringOrdersQuery,
  delayMs = MOCK_API_DELAY_MS,
): Promise<GetRecurringOrdersResponse> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));

  const orders = getRecurringOrdersFromMockState(query.walletAddress)
    .filter((order) => {
      const sourceAssetId = order.src.asset.assetId;
      const destinationAssetId = order.dest.asset.assetId;

      if (
        query.orderStates &&
        !query.orderStates.some((state) => state === order.state)
      ) {
        return false;
      }
      if (
        query.chainId &&
        (!isCaipAssetType(sourceAssetId) ||
          parseCaipAssetType(sourceAssetId).chainId !== query.chainId)
      ) {
        return false;
      }
      if (
        query.assetId &&
        !recurringAssetIdsMatch(sourceAssetId, query.assetId) &&
        !recurringAssetIdsMatch(destinationAssetId, query.assetId)
      ) {
        return false;
      }
      return true;
    })
    .sort(
      (left, right) =>
        Date.parse(right.timingData.createdAt) -
        Date.parse(left.timingData.createdAt),
    );
  const limit = query.limit ?? DEFAULT_ORDERS_PAGE_LIMIT;
  const pageStart = Number(query.cursor ?? 0);
  const page = orders.slice(pageStart, pageStart + limit);
  const nextPageStart = pageStart + page.length;

  return parseGetRecurringOrdersResponse({
    orders: page,
    ...(nextPageStart < orders.length
      ? { nextCursor: String(nextPageStart) }
      : {}),
  });
}

export async function getRecurringOrdersByAsset(
  query: GetRecurringOrdersByAssetQuery,
  delayMs = MOCK_API_DELAY_MS,
): Promise<GetRecurringOrdersByAssetResponse> {
  const response = await getRecurringOrders(
    {
      walletAddress: query.walletAddress,
      orderStates: [RecurringOrderState.Open],
      assetId: query.assetId,
      limit: 1,
    },
    delayMs,
  );

  return response.orders;
}

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

  const swaps = [...orderSwaps].sort(
    (left, right) =>
      Date.parse(right.timingData.executedAt ?? right.timingData.scheduledAt) -
      Date.parse(left.timingData.executedAt ?? left.timingData.scheduledAt),
  );
  const limit = query.limit ?? DEFAULT_SWAPS_PAGE_LIMIT;
  const pageStart = Number(query.cursor ?? 0);
  const page = swaps.slice(pageStart, pageStart + limit);
  const nextPageStart = pageStart + page.length;

  return parseGetRecurringSwapsResponse({
    swaps: page,
    ...(nextPageStart < swaps.length
      ? { nextCursor: String(nextPageStart) }
      : {}),
  });
}

export async function createRecurringOrder(
  request?: CreateRecurringOrderRequest,
): Promise<CreateRecurringOrderResponse> {
  if (!IS_RECURRING_ORDERS_API_ENABLED) {
    await new Promise((resolve) => setTimeout(resolve, MOCK_API_DELAY_MS));
    return parseCreateRecurringOrderResponse({
      order: MOCK_RECURRING_OPEN_ORDER,
    });
  }

  if (!request) {
    throw new Error(
      'createRecurringOrder: Request required when the recurring orders API is enabled',
    );
  }

  const response = await fetch(getRecurringOrdersUrl(), {
    method: 'POST',
    headers: await getRecurringHeaders(true),
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    return throwRecurringApiRequestError(response, 'createRecurringOrder');
  }

  return parseCreateRecurringOrderResponse(await response.json());
}
