import {
  assetIdsMatch,
  BridgeClientId,
  getClientHeaders,
} from '@metamask/bridge-controller';
import {
  isCaipAccountId,
  isCaipAssetType,
  KnownCaipNamespace,
  parseCaipAccountId,
  parseCaipAssetType,
  parseCaipChainId,
  toCaipAccountId,
} from '@metamask/utils';
import Engine from '../../../../core/Engine';
import { getBaseSemVerVersion } from '../../../../util/version';
import {
  MOCK_RECURRING_OPEN_ORDER,
  MOCK_RECURRING_ORDERS,
} from './recurringOrders.mock';
import { MOCK_RECURRING_SWAPS_BY_ORDER_ID } from './recurringSwaps.mock';
import {
  RecurringOrderState,
  type CancelRecurringOrderResponse,
  type CancelRecurringOrderQuery,
  type CreateRecurringOrderRequest,
  type CreateRecurringOrderResponse,
  type GetRecurringOrdersByAssetQuery,
  type GetRecurringOrdersByAssetResponse,
  type ListRecurringOrdersQuery,
  type ListRecurringOrdersResponse,
  type ListRecurringSwapsQuery,
  type ListRecurringSwapsResponse,
  type RecurringApiError,
  type RecurringApiErrorCode,
  type RecurringOrder,
} from './recurringOrders.types';
import {
  parseCancelRecurringOrderResponse,
  parseCreateRecurringOrderResponse,
  parseListRecurringOrdersResponse,
  parseListRecurringSwapsResponse,
  parseRecurringApiError,
} from './recurringOrders.validators';
import { getRecurringOrdersBaseUrl } from './getRecurringOrdersBaseUrl';

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
  return `${getRecurringOrdersBaseUrl()}${RECURRING_ORDERS_PATH}${path}`;
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

function getAccountWalletAddress(accountAddress: string): string | undefined {
  return isCaipAccountId(accountAddress)
    ? parseCaipAccountId(accountAddress).address.toLowerCase()
    : undefined;
}

function getMockAccountAddress(
  order: RecurringOrder,
  requestedAccountAddress?: string,
): RecurringOrder['accountAddress'] {
  const walletAddress = requestedAccountAddress
    ? getAccountWalletAddress(requestedAccountAddress)
    : undefined;
  const sourceAssetId = order.src.asset.assetId;

  if (!walletAddress || !isCaipAssetType(sourceAssetId)) {
    return order.accountAddress;
  }

  const { reference } = parseCaipChainId(
    parseCaipAssetType(sourceAssetId).chainId,
  );

  return toCaipAccountId(KnownCaipNamespace.Eip155, reference, walletAddress);
}

function getRecurringOrdersFromMockState(
  accountAddress?: string,
): RecurringOrder[] {
  return MOCK_RECURRING_ORDERS.map((order) => ({
    ...order,
    accountAddress: getMockAccountAddress(order, accountAddress),
    ...(cancelledOrderIds.has(order.id)
      ? {
          state: RecurringOrderState.Cancelled,
          isCancellable: false,
          timingData: {
            ...order.timingData,
            closedAt: order.timingData.closedAt ?? order.timingData.endsAt,
          },
        }
      : {}),
  }));
}

export async function cancelRecurringOrder(
  orderId: string,
  { accountAddress }: CancelRecurringOrderQuery,
  delayMs = MOCK_API_DELAY_MS,
): Promise<CancelRecurringOrderResponse> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));

  const walletAddress = getAccountWalletAddress(accountAddress);
  const order = getRecurringOrdersFromMockState(accountAddress).find(
    (candidate) =>
      candidate.id === orderId &&
      getAccountWalletAddress(candidate.accountAddress) === walletAddress,
  );
  if (!order) {
    throw new Error('order_not_found');
  }
  if (order.state === RecurringOrderState.Cancelled) {
    return parseCancelRecurringOrderResponse({ order });
  }
  if (
    order.state === RecurringOrderState.Completed ||
    order.state === RecurringOrderState.Expired
  ) {
    throw new Error('order_not_cancellable');
  }

  cancelledOrderIds.add(orderId);
  return parseCancelRecurringOrderResponse({
    order: {
      ...order,
      state: RecurringOrderState.Cancelled,
      isCancellable: false,
      timingData: {
        ...order.timingData,
        closedAt: order.timingData.closedAt ?? order.timingData.endsAt,
      },
    },
  });
}

export async function getRecurringOrders(
  query: ListRecurringOrdersQuery,
  delayMs = MOCK_API_DELAY_MS,
): Promise<ListRecurringOrdersResponse> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));

  const walletAddress = getAccountWalletAddress(query.accountAddress);
  const orders = getRecurringOrdersFromMockState(query.accountAddress)
    .filter((order) => {
      const sourceAssetId = order.src.asset.assetId;
      const destinationAssetId = order.dest.asset.assetId;

      if (getAccountWalletAddress(order.accountAddress) !== walletAddress) {
        return false;
      }
      if (
        query.states &&
        !query.states.some((state) => state === order.state)
      ) {
        return false;
      }
      if (
        query.chainIds &&
        (!isCaipAssetType(sourceAssetId) ||
          !query.chainIds.includes(parseCaipAssetType(sourceAssetId).chainId))
      ) {
        return false;
      }
      if (
        query.asset &&
        !recurringAssetIdsMatch(sourceAssetId, query.asset) &&
        !recurringAssetIdsMatch(destinationAssetId, query.asset)
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
  const pageStart = Number(query.after ?? 0);
  const page = orders.slice(pageStart, pageStart + limit);
  const nextPageStart = pageStart + page.length;
  const hasNextPage = nextPageStart < orders.length;

  return parseListRecurringOrdersResponse({
    orders: page,
    ...(hasNextPage ? { endCursor: String(nextPageStart) } : {}),
    hasNextPage,
  });
}

export async function getRecurringOrdersByAsset(
  query: GetRecurringOrdersByAssetQuery,
  delayMs = MOCK_API_DELAY_MS,
): Promise<GetRecurringOrdersByAssetResponse> {
  const response = await getRecurringOrders(
    {
      accountAddress: toCaipAccountId(
        KnownCaipNamespace.Eip155,
        '1',
        query.walletAddress,
      ),
      states: [RecurringOrderState.Open],
      asset: query.assetId,
      limit: 1,
    },
    delayMs,
  );

  return response.orders;
}

export async function getRecurringSwaps(
  orderId: string,
  query: ListRecurringSwapsQuery,
  delayMs = MOCK_API_DELAY_MS,
): Promise<ListRecurringSwapsResponse> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));

  const orderSwaps = MOCK_RECURRING_SWAPS_BY_ORDER_ID[orderId];
  const order = getRecurringOrdersFromMockState(query.accountAddress).find(
    ({ id }) => id === orderId,
  );
  if (
    !orderSwaps ||
    !order ||
    getAccountWalletAddress(order.accountAddress) !==
      getAccountWalletAddress(query.accountAddress)
  ) {
    throw new Error('order_not_found');
  }

  const swaps = [...orderSwaps].sort(
    (left, right) =>
      Date.parse(right.timingData.executedAt ?? right.timingData.scheduledAt) -
      Date.parse(left.timingData.executedAt ?? left.timingData.scheduledAt),
  );
  const limit = query.limit ?? DEFAULT_SWAPS_PAGE_LIMIT;
  const pageStart = Number(query.after ?? 0);
  const page = swaps.slice(pageStart, pageStart + limit);
  const nextPageStart = pageStart + page.length;
  const hasNextPage = nextPageStart < swaps.length;

  return parseListRecurringSwapsResponse({
    swaps: page,
    ...(hasNextPage ? { endCursor: String(nextPageStart) } : {}),
    hasNextPage,
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
