import Engine from '../../../app/core/Engine';
import { assetIdsMatch } from '@metamask/bridge-controller';
import { isCaipAssetType, parseCaipAssetType } from '@metamask/utils';
import { MOCK_RECURRING_ORDERS } from '../../../app/components/UI/Bridge/api/recurringOrders.mock';
// CV injects DataService responses and spies cancellation so pending and
// failed mutation states remain deterministic without live HTTP.
import { recurringOrdersApiClient } from '../../../app/components/UI/Bridge/api/recurringOrders.client';
import { MOCK_RECURRING_SWAPS_BY_ORDER_ID } from '../../../app/components/UI/Bridge/api/recurringSwaps.mock';
import {
  type CancelRecurringOrderQuery,
  RecurringOrderState,
  type CancelRecurringOrderResponse,
  type GetRecurringOrderQuery,
  type GetRecurringOrderResponse,
  type GetRecurringOrdersByAssetResponse,
  type ListRecurringOrdersResponse,
  type ListRecurringSwapsResponse,
  RecurringSwapStatus,
} from '../../../app/components/UI/Bridge/api/recurringOrders.types';
import type {
  RecurringOrdersByAssetQueryParams,
  RecurringOrdersQueryParams,
  RecurringSwapsQueryParams,
} from '../../../app/components/UI/Bridge/queries/recurringOrders';
// eslint-disable-next-line import-x/no-extraneous-dependencies
import nock from 'nock';

import {
  type MockAccountsApiTransaction,
  toV5TransactionRecord,
} from './accounts-transactions';
import {
  clearAllNockMocks,
  disableNetConnect,
  teardownNock,
} from './nockHelpers';
import { restoreFetchPath, stubFetchPath } from './fetchStub';

type MessengerCall = (action: string, ...args: unknown[]) => unknown;

const messengerCall = Engine.controllerMessenger
  .call as unknown as jest.MockedFunction<MessengerCall>;
const defaultImplementation = messengerCall.getMockImplementation();
let cancelRecurringOrderSpy:
  | jest.SpiedFunction<typeof recurringOrdersApiClient.cancelRecurringOrder>
  | undefined;

interface RecurringOrdersDataServiceMockOptions {
  recurringOrder?: typeof getMockRecurringOrder;
  recurringOrders?: typeof getMockRecurringOrders;
  recurringOrdersByAsset?: typeof getMockRecurringOrdersByAsset;
  recurringSwaps?: typeof getMockRecurringSwaps;
  cancelRecurringOrder?: typeof cancelMockRecurringOrder;
}

const cancelledOrderIds = new Set<string>();

function recurringAssetIdsMatch(left: string, right: string): boolean {
  return (
    isCaipAssetType(left) &&
    isCaipAssetType(right) &&
    assetIdsMatch(left, right)
  );
}

function getMockOrders() {
  return MOCK_RECURRING_ORDERS.map((order) =>
    cancelledOrderIds.has(order.id)
      ? {
          ...order,
          state: RecurringOrderState.Cancelled,
          isCancellable: false,
          timingData: {
            ...order.timingData,
            closedAt: order.timingData.closedAt ?? order.timingData.endsAt,
          },
        }
      : order,
  );
}

export async function getMockRecurringOrder(
  orderId: string,
  _query: GetRecurringOrderQuery,
): Promise<GetRecurringOrderResponse> {
  const order = getMockOrders().find(({ id }) => id === orderId);
  if (!order) {
    throw new Error('order_not_found');
  }

  return { order };
}

export async function getMockRecurringOrders(
  params: RecurringOrdersQueryParams & { cursor?: string },
): Promise<ListRecurringOrdersResponse> {
  const orders = getMockOrders()
    .filter((order) => {
      const sourceAssetId = order.src.asset.assetId;
      const destinationAssetId = order.dest.asset.assetId;

      return (
        (!params.orderStates ||
          params.orderStates.some((state) => state === order.state)) &&
        (!params.chainId ||
          (isCaipAssetType(sourceAssetId) &&
            parseCaipAssetType(sourceAssetId).chainId === params.chainId)) &&
        (!params.assetId ||
          recurringAssetIdsMatch(sourceAssetId, params.assetId) ||
          recurringAssetIdsMatch(destinationAssetId, params.assetId))
      );
    })
    .sort(
      (left, right) =>
        Date.parse(right.timingData.createdAt) -
        Date.parse(left.timingData.createdAt),
    );
  const pageStart = Number(params.cursor ?? 0);
  const limit = params.limit ?? 20;
  const page = orders.slice(pageStart, pageStart + limit);
  const nextPageStart = pageStart + page.length;
  const hasNextPage = nextPageStart < orders.length;

  return {
    orders: page,
    ...(hasNextPage ? { endCursor: String(nextPageStart) } : {}),
    hasNextPage,
    total: orders.length,
  };
}

export async function getMockRecurringOrdersByAsset(
  params: RecurringOrdersByAssetQueryParams,
): Promise<GetRecurringOrdersByAssetResponse> {
  return getMockOrders()
    .filter((order) => {
      const sourceAssetId = order.src.asset.assetId;
      const destinationAssetId = order.dest.asset.assetId;

      return (
        order.state === RecurringOrderState.Open &&
        (recurringAssetIdsMatch(sourceAssetId, params.assetId) ||
          recurringAssetIdsMatch(destinationAssetId, params.assetId))
      );
    })
    .sort(
      (left, right) =>
        Date.parse(right.timingData.createdAt) -
        Date.parse(left.timingData.createdAt),
    )
    .slice(0, 1);
}

export async function getMockRecurringSwaps(
  orderId: string,
  params: RecurringSwapsQueryParams & { cursor?: string },
): Promise<ListRecurringSwapsResponse> {
  const swaps = [...(MOCK_RECURRING_SWAPS_BY_ORDER_ID[orderId] ?? [])].sort(
    (left, right) =>
      Date.parse(right.timingData.executedAt) -
      Date.parse(left.timingData.executedAt),
  );
  const pageStart = Number(params.cursor ?? 0);
  const limit = params.limit ?? 20;
  const page = swaps.slice(pageStart, pageStart + limit);
  const nextPageStart = pageStart + page.length;
  const hasNextPage = nextPageStart < swaps.length;

  return {
    swaps: page,
    ...(hasNextPage ? { endCursor: String(nextPageStart) } : {}),
    hasNextPage,
    total: swaps.length,
  };
}

export async function cancelMockRecurringOrder(
  orderId: string,
  _query: CancelRecurringOrderQuery,
): Promise<CancelRecurringOrderResponse> {
  const order = getMockOrders().find(({ id }) => id === orderId);
  if (!order) {
    throw new Error('order_not_found');
  }
  if (order.state === RecurringOrderState.Cancelled) {
    return { order };
  }
  if (order.state === RecurringOrderState.Completed) {
    throw new Error('order_not_cancellable');
  }

  cancelledOrderIds.add(orderId);
  return {
    order: {
      ...order,
      state: RecurringOrderState.Cancelled,
      isCancellable: false,
      timingData: {
        ...order.timingData,
        closedAt: order.timingData.closedAt ?? order.timingData.endsAt,
      },
    },
  };
}

const ACCOUNTS_API_ORIGIN = 'https://accounts.api.cx.metamask.io';
const BRIDGE_CV_ACCOUNT = '0x0000000000000000000000000000000000000001';

function buildMockRecurringSwapTransactions(): Record<
  string,
  MockAccountsApiTransaction
> {
  const transactions: Record<string, MockAccountsApiTransaction> = {};

  for (const swaps of Object.values(MOCK_RECURRING_SWAPS_BY_ORDER_ID)) {
    for (const swap of swaps) {
      if (swap.txHash) {
        transactions[swap.txHash.toLowerCase()] = {
          hash: swap.txHash,
          timestamp:
            swap.timingData.executedAt ?? swap.timingData.scheduledAt ?? '',
          chainId: 1,
          from: BRIDGE_CV_ACCOUNT,
          to: '0x0000000000000000000000000000000000000000',
          value: swap.src.amount,
          isError: swap.status === RecurringSwapStatus.Failed,
          transactionCategory: 'swap',
        };
      }
    }
  }

  return transactions;
}

function setupRecurringSwapTransactionsApiMock() {
  const transactions = buildMockRecurringSwapTransactions();

  clearAllNockMocks();
  disableNetConnect();

  for (const [txHash, transaction] of Object.entries(transactions)) {
    const path = `/v5/accounts/eip155:1:${BRIDGE_CV_ACCOUNT}/transactions/${txHash}`;
    const response = toV5TransactionRecord(transaction, BRIDGE_CV_ACCOUNT);

    nock(ACCOUNTS_API_ORIGIN).persist().get(path).query(true).reply(200, {
      data: response,
    });

    stubFetchPath(ACCOUNTS_API_ORIGIN, path, {
      data: response,
    });
  }
}

function clearRecurringSwapTransactionsApiMock() {
  const transactions = buildMockRecurringSwapTransactions();

  for (const txHash of Object.keys(transactions)) {
    const path = `/v5/accounts/eip155:1:${BRIDGE_CV_ACCOUNT}/transactions/${txHash}`;
    restoreFetchPath(ACCOUNTS_API_ORIGIN, path);
  }

  teardownNock();
}

export function setupRecurringOrdersDataServiceMock({
  recurringOrder = getMockRecurringOrder,
  recurringOrders = getMockRecurringOrders,
  recurringOrdersByAsset = getMockRecurringOrdersByAsset,
  recurringSwaps = getMockRecurringSwaps,
  cancelRecurringOrder: cancelRecurringOrderRequest = cancelMockRecurringOrder,
}: RecurringOrdersDataServiceMockOptions = {}) {
  setupRecurringSwapTransactionsApiMock();

  cancelRecurringOrderSpy?.mockRestore();
  cancelRecurringOrderSpy = jest
    .spyOn(recurringOrdersApiClient, 'cancelRecurringOrder')
    .mockImplementation(cancelRecurringOrderRequest);

  messengerCall.mockImplementation(
    (...messengerArgs: [string, ...unknown[]]) => {
      const [action] = messengerArgs;

      if (action === 'RecurringOrdersDataService:getRecurringOrder') {
        const [, orderId, params] = messengerArgs as [
          string,
          string,
          GetRecurringOrderQuery,
        ];
        return recurringOrder(orderId, params);
      }

      if (action === 'RecurringOrdersDataService:getRecurringOrders') {
        const [, params, cursor] = messengerArgs as [
          string,
          RecurringOrdersQueryParams,
          string | undefined,
        ];
        return recurringOrders({ ...params, cursor });
      }

      if (action === 'RecurringOrdersDataService:getRecurringOrdersByAsset') {
        const [, params] = messengerArgs as [
          string,
          RecurringOrdersByAssetQueryParams,
        ];
        return recurringOrdersByAsset(params);
      }

      if (action === 'RecurringOrdersDataService:getRecurringSwaps') {
        const [, orderId, params, cursor] = messengerArgs as [
          string,
          string,
          RecurringSwapsQueryParams,
          string | undefined,
        ];
        return recurringSwaps(orderId, { ...params, cursor });
      }

      return defaultImplementation?.(...messengerArgs);
    },
  );
}

export function clearRecurringOrdersDataServiceMock() {
  clearRecurringSwapTransactionsApiMock();

  cancelRecurringOrderSpy?.mockRestore();
  cancelRecurringOrderSpy = undefined;

  if (defaultImplementation) {
    messengerCall.mockImplementation(defaultImplementation);
  } else {
    messengerCall.mockReset();
  }
  cancelledOrderIds.clear();
}
