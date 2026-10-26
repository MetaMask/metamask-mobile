import Engine from '../../../app/core/Engine';
import { assetIdsMatch } from '@metamask/bridge-controller';
import { isCaipAssetType, parseCaipAssetType } from '@metamask/utils';
import { MOCK_RECURRING_ORDERS } from '../../../app/components/UI/Bridge/api/recurringOrders.mock';
import { MOCK_RECURRING_SWAPS_BY_ORDER_ID } from '../../../app/components/UI/Bridge/api/recurringSwaps.mock';
import {
  RecurringOrderState,
  type CancelRecurringOrderResponse,
  type GetRecurringOrdersByAssetResponse,
  type GetRecurringOrdersResponse,
  type GetRecurringSwapsResponse,
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
      ? { ...order, state: RecurringOrderState.Cancelled }
      : order,
  );
}

export async function getMockRecurringOrders(
  params: RecurringOrdersQueryParams & { cursor?: string },
): Promise<GetRecurringOrdersResponse> {
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

  return {
    orders: page,
    ...(nextPageStart < orders.length
      ? { nextCursor: String(nextPageStart) }
      : {}),
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
): Promise<GetRecurringSwapsResponse> {
  const swaps = [...(MOCK_RECURRING_SWAPS_BY_ORDER_ID[orderId] ?? [])].sort(
    (left, right) =>
      Date.parse(right.timingData.executedAt ?? right.timingData.scheduledAt) -
      Date.parse(left.timingData.executedAt ?? left.timingData.scheduledAt),
  );
  const pageStart = Number(params.cursor ?? 0);
  const limit = params.limit ?? 20;
  const page = swaps.slice(pageStart, pageStart + limit);
  const nextPageStart = pageStart + page.length;

  return {
    swaps: page,
    ...(nextPageStart < swaps.length
      ? { nextCursor: String(nextPageStart) }
      : {}),
  };
}

export async function cancelMockRecurringOrder(
  orderId: string,
  _accountAddress: string,
): Promise<CancelRecurringOrderResponse> {
  const order = getMockOrders().find(({ id }) => id === orderId);
  if (!order) {
    throw new Error('order_not_found');
  }
  if (order.state !== RecurringOrderState.Open) {
    throw new Error('order_not_cancellable');
  }

  cancelledOrderIds.add(orderId);
  return {
    order: { ...order, state: RecurringOrderState.Cancelled },
  };
}

export function setupRecurringOrdersDataServiceMock({
  recurringOrders = getMockRecurringOrders,
  recurringOrdersByAsset = getMockRecurringOrdersByAsset,
  recurringSwaps = getMockRecurringSwaps,
  cancelRecurringOrder: cancelRecurringOrderRequest = cancelMockRecurringOrder,
}: RecurringOrdersDataServiceMockOptions = {}) {
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

      if (action === 'RecurringOrdersDataService:cancelRecurringOrder') {
        const [, orderId, accountAddress] = messengerArgs as [
          string,
          string,
          string,
        ];
        return cancelRecurringOrderRequest(orderId, accountAddress);
      }

      return defaultImplementation?.(...messengerArgs);
    },
  );
}

export function clearRecurringOrdersDataServiceMock() {
  if (defaultImplementation) {
    messengerCall.mockImplementation(defaultImplementation);
  } else {
    messengerCall.mockReset();
  }
  cancelledOrderIds.clear();
}
