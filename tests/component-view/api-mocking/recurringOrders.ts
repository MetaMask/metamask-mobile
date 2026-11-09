import Engine from '../../../app/core/Engine';
import { assetIdsMatch } from '@metamask/bridge-controller';
import { isCaipAssetType, parseCaipAssetType } from '@metamask/utils';
import { MOCK_RECURRING_ORDERS } from '../../../app/components/UI/Bridge/api/recurringOrders.mock';
// Namespace import is required so the component-view API mock can replace the exported request.
// eslint-disable-next-line import-x/no-namespace
import * as recurringOrdersApi from '../../../app/components/UI/Bridge/api/recurringOrders';
import { MOCK_RECURRING_SWAPS_BY_ORDER_ID } from '../../../app/components/UI/Bridge/api/recurringSwaps.mock';
import {
  type CancelRecurringOrderQuery,
  RecurringOrderState,
  type CancelRecurringOrderResponse,
  type GetRecurringOrdersByAssetResponse,
  type ListRecurringOrdersResponse,
  type ListRecurringSwapsResponse,
} from '../../../app/components/UI/Bridge/api/recurringOrders.types';
import type {
  RecurringOrdersByAssetQueryParams,
  RecurringOrdersQueryParams,
  RecurringSwapsQueryParams,
} from '../../../app/components/UI/Bridge/queries/recurringOrders';

type MessengerCall = (action: string, ...args: unknown[]) => unknown;

const messengerCall = Engine.controllerMessenger
  .call as unknown as jest.MockedFunction<MessengerCall>;
const defaultImplementation = messengerCall.getMockImplementation();
let cancelRecurringOrderSpy:
  | jest.SpiedFunction<typeof recurringOrdersApi.cancelRecurringOrder>
  | undefined;

interface RecurringOrdersDataServiceMockOptions {
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
      Date.parse(right.timingData.executedAt ?? right.timingData.scheduledAt) -
      Date.parse(left.timingData.executedAt ?? left.timingData.scheduledAt),
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
  if (
    order.state === RecurringOrderState.Completed ||
    order.state === RecurringOrderState.Expired
  ) {
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

export function setupRecurringOrdersDataServiceMock({
  recurringOrders = getMockRecurringOrders,
  recurringOrdersByAsset = getMockRecurringOrdersByAsset,
  recurringSwaps = getMockRecurringSwaps,
  cancelRecurringOrder: cancelRecurringOrderRequest = cancelMockRecurringOrder,
}: RecurringOrdersDataServiceMockOptions = {}) {
  cancelRecurringOrderSpy?.mockRestore();
  cancelRecurringOrderSpy = jest
    .spyOn(recurringOrdersApi, 'cancelRecurringOrder')
    .mockImplementation(cancelRecurringOrderRequest);

  messengerCall.mockImplementation(
    (...messengerArgs: [string, ...unknown[]]) => {
      const [action] = messengerArgs;

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
  cancelRecurringOrderSpy?.mockRestore();
  cancelRecurringOrderSpy = undefined;

  if (defaultImplementation) {
    messengerCall.mockImplementation(defaultImplementation);
  } else {
    messengerCall.mockReset();
  }
  cancelledOrderIds.clear();
}
