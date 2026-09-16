import { Messenger } from '@metamask/messenger';
import { getRecurringOrders } from '../api/recurringOrders';
import {
  MOCK_RECURRING_OPEN_ORDER,
  MOCK_RECURRING_OPEN_ORDER_SECONDARY,
} from '../api/recurringOrders.mock';
import { RecurringOrderStatus } from '../api/recurringOrders.types';
import type { RecurringOrdersQueryParams } from '../queries/recurringOrders';
import {
  RecurringOrdersDataService,
  type RecurringOrdersDataServiceMessenger,
} from './RecurringOrdersDataService';

jest.mock('../api/recurringOrders', () => ({
  getRecurringOrders: jest.fn(),
}));

const mockGetRecurringOrders = jest.mocked(getRecurringOrders);
const PARAMS: RecurringOrdersQueryParams = {
  walletAddress: '0x1234567890123456789012345678901234567890',
  status: [RecurringOrderStatus.Open],
  chainId: 'eip155:1',
  limit: 20,
};

function createService() {
  const messenger: RecurringOrdersDataServiceMessenger = new Messenger({
    namespace: 'RecurringOrdersDataService',
  });

  return new RecurringOrdersDataService({ messenger });
}

describe('RecurringOrdersDataService', () => {
  const services: RecurringOrdersDataService[] = [];

  afterEach(() => {
    services.splice(0).forEach((service) => service.destroy());
    jest.resetAllMocks();
  });

  function buildService() {
    const service = createService();
    services.push(service);
    return service;
  }

  it('forwards query parameters to the recurring-orders transport', async () => {
    mockGetRecurringOrders.mockResolvedValue({
      orders: [MOCK_RECURRING_OPEN_ORDER],
    });
    const service = buildService();

    const result = await service.getRecurringOrders(PARAMS);

    expect(mockGetRecurringOrders).toHaveBeenCalledWith({
      ...PARAMS,
      cursor: undefined,
    });
    expect(result.orders).toStrictEqual([MOCK_RECURRING_OPEN_ORDER]);
  });

  it('fetches the page identified by the previous response cursor', async () => {
    mockGetRecurringOrders
      .mockResolvedValueOnce({
        orders: [MOCK_RECURRING_OPEN_ORDER],
        nextCursor: 'next-page',
      })
      .mockResolvedValueOnce({
        orders: [MOCK_RECURRING_OPEN_ORDER_SECONDARY],
      });
    const service = buildService();

    const firstPage = await service.getRecurringOrders(PARAMS);
    const secondPage = await service.getRecurringOrders(
      PARAMS,
      firstPage.nextCursor,
    );

    expect(mockGetRecurringOrders).toHaveBeenNthCalledWith(1, {
      ...PARAMS,
      cursor: undefined,
    });
    expect(mockGetRecurringOrders).toHaveBeenNthCalledWith(2, {
      ...PARAMS,
      cursor: 'next-page',
    });
    expect(secondPage.orders).toStrictEqual([
      MOCK_RECURRING_OPEN_ORDER_SECONDARY,
    ]);
  });
});
