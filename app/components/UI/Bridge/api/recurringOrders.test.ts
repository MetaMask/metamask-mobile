import {
  MOCK_RECURRING_CANCELLED_ORDER,
  MOCK_RECURRING_COMPLETED_ORDER,
  MOCK_RECURRING_OPEN_ORDER_SECONDARY,
  MOCK_RECURRING_OPEN_ORDER_TERTIARY,
} from './recurringOrders.mock';
import { getRecurringOrders } from './recurringOrders';
import { RecurringOrderStatus } from './recurringOrders.types';

const WALLET_ADDRESS = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

describe('getRecurringOrders', () => {
  it('returns newest open orders with an opaque next cursor', async () => {
    const firstPage = await getRecurringOrders({
      walletAddress: WALLET_ADDRESS,
      status: [RecurringOrderStatus.Open],
      limit: 2,
    });

    expect(firstPage.orders.map(({ orderId }) => orderId)).toStrictEqual([
      MOCK_RECURRING_OPEN_ORDER_TERTIARY.orderId,
      MOCK_RECURRING_OPEN_ORDER_SECONDARY.orderId,
    ]);
    expect(firstPage.nextCursor).toEqual(expect.any(String));
  });

  it('echoes the cursor into the next page and omits the final cursor', async () => {
    const firstPage = await getRecurringOrders({
      walletAddress: WALLET_ADDRESS,
      status: [RecurringOrderStatus.Open],
      limit: 2,
    });

    const secondPage = await getRecurringOrders({
      walletAddress: WALLET_ADDRESS,
      status: [RecurringOrderStatus.Open],
      limit: 2,
      cursor: firstPage.nextCursor,
    });

    expect(secondPage.orders).toHaveLength(1);
    expect(secondPage.nextCursor).toBeUndefined();
  });

  it('returns orders matching any requested history status', async () => {
    const result = await getRecurringOrders({
      walletAddress: WALLET_ADDRESS,
      status: [RecurringOrderStatus.Completed, RecurringOrderStatus.Cancelled],
    });

    expect(result.orders.map(({ orderId }) => orderId)).toStrictEqual([
      MOCK_RECURRING_COMPLETED_ORDER.orderId,
      MOCK_RECURRING_CANCELLED_ORDER.orderId,
    ]);
  });

  it('filters by CAIP chain and scopes results to the requested wallet', async () => {
    const result = await getRecurringOrders({
      walletAddress: WALLET_ADDRESS,
      status: [RecurringOrderStatus.Open],
      chainId: 'eip155:56',
    });

    expect(result.orders).toHaveLength(1);
    expect(result.orders[0].orderId).toBe(
      MOCK_RECURRING_OPEN_ORDER_SECONDARY.orderId,
    );
    expect(result.orders[0].src.walletAddress).toBe(WALLET_ADDRESS);
    expect(result.orders[0].dest.walletAddress).toBe(WALLET_ADDRESS);
  });

  it('resolves only after the configured delay', async () => {
    let hasResolved = false;
    const request = getRecurringOrders(
      {
        walletAddress: WALLET_ADDRESS,
      },
      10,
    ).then((response) => {
      hasResolved = true;
      return response;
    });

    expect(hasResolved).toBe(false);
    await request;

    expect(hasResolved).toBe(true);
  });
});
