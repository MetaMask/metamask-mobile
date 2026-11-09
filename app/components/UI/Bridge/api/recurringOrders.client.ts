import { BridgeClientId, getClientHeaders } from '@metamask/bridge-controller';
import Engine from '../../../../core/Engine';
import { getBaseSemVerVersion } from '../../../../util/version';
import { getRecurringOrdersBaseUrl } from './getRecurringOrdersBaseUrl';
import type {
  CancelRecurringOrderQuery,
  CancelRecurringOrderResponse,
  CreateRecurringOrderRequest,
  CreateRecurringOrderResponse,
  GetRecurringOrderQuery,
  GetRecurringOrderResponse,
  ListRecurringOrdersQuery,
  ListRecurringOrdersResponse,
  ListRecurringSwapsQuery,
  ListRecurringSwapsResponse,
  PrepareRecurringDelegationQuery,
  PrepareRecurringDelegationResponse,
  RecurringApiError,
  RecurringApiErrorCode,
} from './recurringOrders.types';
import {
  parseCancelRecurringOrderResponse,
  parseCreateRecurringOrderResponse,
  parseGetRecurringOrderResponse,
  parseListRecurringOrdersResponse,
  parseListRecurringSwapsResponse,
  parsePrepareRecurringDelegationResponse,
  parseRecurringApiError,
} from './recurringOrders.validators';

const RECURRING_ORDERS_PATH = '/v2/orders/recurring';

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

function getRecurringOrdersUrl(path = '', searchParams?: URLSearchParams) {
  const query = searchParams?.toString();
  return `${getRecurringOrdersBaseUrl()}${RECURRING_ORDERS_PATH}${path}${
    query ? `?${query}` : ''
  }`;
}

async function parseResponse<T>(
  response: Response,
  operation: string,
  parse: (value: unknown) => T,
): Promise<T> {
  if (!response.ok) {
    return throwRecurringApiRequestError(response, operation);
  }

  return parse(await response.json());
}

async function prepareRecurringDelegation(
  query: PrepareRecurringDelegationQuery,
): Promise<PrepareRecurringDelegationResponse> {
  const searchParams = new URLSearchParams({
    clientOrderId: query.clientOrderId,
    accountAddress: query.accountAddress,
    srcAssetId: query.srcAssetId,
    srcAmount: query.srcAmount,
    destAssetId: query.destAssetId,
    slippage: String(query.slippage),
    every: String(query.every),
    unit: query.unit,
    repeatCount: String(query.repeatCount),
  });
  const response = await fetch(
    getRecurringOrdersUrl('/delegations', searchParams),
    {
      method: 'GET',
      headers: await getRecurringHeaders(),
    },
  );

  return parseResponse(
    response,
    'prepareRecurringDelegation',
    parsePrepareRecurringDelegationResponse,
  );
}

async function createRecurringOrder(
  request: CreateRecurringOrderRequest,
): Promise<CreateRecurringOrderResponse> {
  const response = await fetch(getRecurringOrdersUrl(), {
    method: 'POST',
    headers: await getRecurringHeaders(true),
    body: JSON.stringify(request),
  });

  return parseResponse(
    response,
    'createRecurringOrder',
    parseCreateRecurringOrderResponse,
  );
}

async function getRecurringOrders(
  query: ListRecurringOrdersQuery,
): Promise<ListRecurringOrdersResponse> {
  const searchParams = new URLSearchParams({
    accountAddress: query.accountAddress,
  });

  query.states?.forEach((state) => searchParams.append('states', state));
  query.chainIds?.forEach((chainId) =>
    searchParams.append('chainIds', chainId),
  );
  if (query.asset) searchParams.set('asset', query.asset);
  if (query.limit !== undefined) {
    searchParams.set('limit', String(query.limit));
  }
  if (query.after) searchParams.set('after', query.after);

  const response = await fetch(getRecurringOrdersUrl('', searchParams), {
    method: 'GET',
    headers: await getRecurringHeaders(),
  });

  return parseResponse(
    response,
    'getRecurringOrders',
    parseListRecurringOrdersResponse,
  );
}

async function getRecurringOrder(
  orderId: string,
  query: GetRecurringOrderQuery,
): Promise<GetRecurringOrderResponse> {
  const searchParams = new URLSearchParams({
    accountAddress: query.accountAddress,
  });
  const response = await fetch(
    getRecurringOrdersUrl(`/${encodeURIComponent(orderId)}`, searchParams),
    {
      method: 'GET',
      headers: await getRecurringHeaders(),
    },
  );

  return parseResponse(
    response,
    'getRecurringOrder',
    parseGetRecurringOrderResponse,
  );
}

async function getRecurringSwaps(
  orderId: string,
  query: ListRecurringSwapsQuery,
): Promise<ListRecurringSwapsResponse> {
  const searchParams = new URLSearchParams({
    accountAddress: query.accountAddress,
  });

  if (query.limit !== undefined) {
    searchParams.set('limit', String(query.limit));
  }
  if (query.after) searchParams.set('after', query.after);

  const response = await fetch(
    getRecurringOrdersUrl(
      `/${encodeURIComponent(orderId)}/swaps`,
      searchParams,
    ),
    {
      method: 'GET',
      headers: await getRecurringHeaders(),
    },
  );

  return parseResponse(
    response,
    'getRecurringSwaps',
    parseListRecurringSwapsResponse,
  );
}

async function cancelRecurringOrder(
  orderId: string,
  query: CancelRecurringOrderQuery,
): Promise<CancelRecurringOrderResponse> {
  const searchParams = new URLSearchParams({
    accountAddress: query.accountAddress,
  });
  const response = await fetch(
    getRecurringOrdersUrl(`/${encodeURIComponent(orderId)}`, searchParams),
    {
      method: 'DELETE',
      headers: await getRecurringHeaders(),
    },
  );

  return parseResponse(
    response,
    'cancelRecurringOrder',
    parseCancelRecurringOrderResponse,
  );
}

export const recurringOrdersApiClient = {
  prepareRecurringDelegation,
  createRecurringOrder,
  getRecurringOrders,
  getRecurringOrder,
  getRecurringSwaps,
  cancelRecurringOrder,
};
