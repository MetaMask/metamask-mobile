import Engine from '../../../app/core/Engine';
import { getLimitOrders } from '../../../app/components/UI/Bridge/api/limitOrders/getLimitOrders';
import type { LimitOrdersQueryParams } from '../../../app/components/UI/Bridge/queries/limitOrders';

const messengerCall = Engine.controllerMessenger.call as unknown as jest.Mock;
// Captured once at import time so `clear` can fully restore the pristine
// mock, regardless of what other api-mocking helpers layered on top of it.
const pristineImplementation = messengerCall.getMockImplementation();

interface LimitOrdersDataServiceMockOptions {
  limitOrders?: typeof getLimitOrders;
}

export function setupLimitOrdersDataServiceMock({
  limitOrders = getLimitOrders,
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
