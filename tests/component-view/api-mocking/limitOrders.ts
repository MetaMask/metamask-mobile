// eslint-disable-next-line import-x/no-extraneous-dependencies
import nock, { type Scope } from 'nock';
import Engine from '../../../app/core/Engine';
import { BRIDGE_API_BASE_URL } from '../../../app/constants/bridge';
import type { CreatedLimitOrderTransaction } from '../../../app/components/UI/Bridge/api/limitOrders/create/schema';
import type { getLimitOrders } from '../../../app/components/UI/Bridge/api/limitOrders/getLimitOrders';
import {
  LimitOrderState,
  type LimitOrder,
} from '../../../app/components/UI/Bridge/api/limitOrders/getLimitOrders/types';
import type { LimitOrdersQueryParams } from '../../../app/components/UI/Bridge/queries/limitOrders';
import { disableNetConnect, teardownNock } from './nockHelpers';

const messengerCall = Engine.controllerMessenger.call as unknown as jest.Mock;
// Captured once at import time so `clear` can fully restore the pristine
// mock, regardless of what other api-mocking helpers layered on top of it.
const pristineImplementation = messengerCall.getMockImplementation();

interface LimitOrdersDataServiceMockOptions {
  limitOrders?: typeof getLimitOrders;
}

export function setupLimitOrdersDataServiceMock({
  // An empty page, so component view tests never reach the API.
  limitOrders = async () => ({ orders: [] }),
}: LimitOrdersDataServiceMockOptions = {}) {
  // Captured at call time (not import time) so this composes with other
  // api-mocking helpers (e.g. recurringOrders) regardless of setup order.
  const previousImplementation = messengerCall.getMockImplementation();

  messengerCall.mockImplementation(
    (...messengerArgs: [string, ...unknown[]]) => {
      const [action] = messengerArgs;

      if (action === 'LimitOrdersDataService:getLimitOrders') {
        const [, params, cursor] = messengerArgs as [
          string,
          LimitOrdersQueryParams,
          string | undefined,
        ];
        return limitOrders({ ...params, cursor });
      }

      return previousImplementation?.(...messengerArgs);
    },
  );
}

export function clearLimitOrdersDataServiceMock() {
  messengerCall.mockImplementation(pristineImplementation);
}

interface CancelLimitOrderApiMockOptions {
  /**
   * The order being cancelled. The request is only intercepted for its id and
   * account, and a successful reply echoes it back as cancelled.
   */
  order: LimitOrder;
  /**
   * HTTP status to reply with. Anything but 2xx fails the cancellation.
   */
  status?: number;
  /**
   * Body to reply with instead of the cancelled order, e.g. to fail response
   * validation.
   */
  body?: nock.Body;
  /**
   * Holds the reply back, so a test can see the sheet while it is in flight.
   */
  delayMs?: number;
  /**
   * Runs as the request is answered, e.g. to move the order out of the open
   * orders that {@link setupLimitOrdersDataServiceMock} serves, the way the
   * API does.
   */
  onRequest?: () => void;
}

/**
 * Registers a one-shot `DELETE /v2/orders/limit/{id}` interceptor on the
 * Bridge API. Call it once per request the test expects, and assert
 * `scope.isDone()` to check the request was made. Pair with
 * {@link clearCancelLimitOrderApiMock} in `afterEach`.
 *
 * @param options - The order to cancel and how the API replies.
 * @returns The nock scope.
 */
export function setupCancelLimitOrderApiMock({
  order,
  status = 200,
  body = {
    order: {
      ...order,
      state: LimitOrderState.Cancelled,
      isCancellable: false,
    },
    transactions: [],
  },
  delayMs = 0,
  onRequest,
}: CancelLimitOrderApiMockOptions): Scope {
  disableNetConnect();

  return nock(BRIDGE_API_BASE_URL)
    .delete(`/v2/orders/limit/${encodeURIComponent(order.id)}`)
    .query({ accountAddress: order.account })
    .delay(delayMs)
    .reply(() => {
      onRequest?.();
      return [status, body];
    });
}

export function clearCancelLimitOrderApiMock() {
  teardownNock();
}

interface GetLimitOrderApiMockOptions {
  /**
   * The order being fetched. The request is only intercepted for its id and
   * account, and a successful reply echoes it back.
   */
  order: LimitOrder;
  /**
   * The fill attempts made against the order.
   */
  transactions?: CreatedLimitOrderTransaction[];
  /**
   * HTTP status to reply with. Anything but 2xx fails the request.
   */
  status?: number;
}

/**
 * Registers a `GET /v2/orders/limit/{id}` interceptor on the Bridge API,
 * replying with the order and its fill attempts. Pair with
 * {@link clearGetLimitOrderApiMock} in `afterEach`.
 *
 * @param options - The order to fetch and how the API replies.
 * @returns The nock scope.
 */
export function setupGetLimitOrderApiMock({
  order,
  transactions = [],
  status = 200,
}: GetLimitOrderApiMockOptions): Scope {
  disableNetConnect();

  return nock(BRIDGE_API_BASE_URL)
    .get(`/v2/orders/limit/${encodeURIComponent(order.id)}`)
    .query({ accountAddress: order.account })
    .reply(status, { order, transactions })
    .persist();
}

export function clearGetLimitOrderApiMock() {
  teardownNock();
}
