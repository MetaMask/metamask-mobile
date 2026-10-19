import {
  MOCK_RECURRING_CANCELLED_ORDER,
  MOCK_RECURRING_COMPLETED_ORDER,
  MOCK_RECURRING_OPEN_ORDER,
  MOCK_RECURRING_OPEN_ORDER_2,
  MOCK_RECURRING_OPEN_ORDER_3,
} from './recurringOrders.mock';
import { MOCK_RECURRING_OPEN_ORDER_SWAPS } from './recurringSwaps.mock';
import {
  cancelRecurringOrder,
  getRecurringOrders,
  getRecurringOrdersByAsset,
  getRecurringSwaps,
  resetRecurringOrdersMockState,
} from './recurringOrders';
import {
  RecurringOrderStatus,
  RecurringSwapStatus,
} from './recurringOrders.types';

const WALLET_ADDRESS = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

afterEach(() => {
  resetRecurringOrdersMockState();
});

describe('getRecurringOrders', () => {
  it('returns newest open orders with an opaque next cursor', async () => {
    const firstPage = await getRecurringOrders({
      walletAddress: WALLET_ADDRESS,
      status: [RecurringOrderStatus.Open],
      limit: 2,
    });

    expect(firstPage.orders.map(({ orderId }) => orderId)).toStrictEqual([
      MOCK_RECURRING_OPEN_ORDER_3.orderId,
      MOCK_RECURRING_OPEN_ORDER_2.orderId,
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
    expect(result.orders[0].orderId).toBe(MOCK_RECURRING_OPEN_ORDER_2.orderId);
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

describe('getRecurringOrdersByAsset', () => {
  it('returns the newest open order for a source asset', async () => {
    const result = await getRecurringOrdersByAsset({
      walletAddress: WALLET_ADDRESS,
      assetId: MOCK_RECURRING_OPEN_ORDER.src.asset.assetId,
    });

    expect(result).toHaveLength(1);
    expect(result[0].orderId).toBe(MOCK_RECURRING_OPEN_ORDER_3.orderId);
  });

  it('returns an order for a destination asset', async () => {
    const result = await getRecurringOrdersByAsset({
      walletAddress: WALLET_ADDRESS,
      assetId: MOCK_RECURRING_OPEN_ORDER.dest.asset.assetId,
    });

    expect(result[0].orderId).toBe(MOCK_RECURRING_OPEN_ORDER_3.orderId);
  });

  it('does not match the same token address on another network', async () => {
    const result = await getRecurringOrdersByAsset({
      walletAddress: WALLET_ADDRESS,
      assetId: 'eip155:8453/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    });

    expect(result).toStrictEqual([]);
  });

  it('scopes the returned order to the requested wallet', async () => {
    const result = await getRecurringOrdersByAsset({
      walletAddress: WALLET_ADDRESS,
      assetId: MOCK_RECURRING_OPEN_ORDER.src.asset.assetId,
    });

    expect(result[0].src.walletAddress).toBe(WALLET_ADDRESS);
    expect(result[0].dest.walletAddress).toBe(WALLET_ADDRESS);
  });

  it('excludes cancelled orders from the result', async () => {
    await cancelRecurringOrder(MOCK_RECURRING_OPEN_ORDER_3.orderId);

    const result = await getRecurringOrdersByAsset({
      walletAddress: WALLET_ADDRESS,
      assetId: MOCK_RECURRING_OPEN_ORDER.src.asset.assetId,
    });

    expect(result[0].orderId).toBe(MOCK_RECURRING_OPEN_ORDER.orderId);
    expect(result[0].status).toBe(RecurringOrderStatus.Open);
  });

  it('resolves only after the configured delay', async () => {
    let hasResolved = false;
    const request = getRecurringOrdersByAsset(
      {
        walletAddress: WALLET_ADDRESS,
        assetId: MOCK_RECURRING_OPEN_ORDER.src.asset.assetId,
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

describe('cancelRecurringOrder', () => {
  it('moves an open order from Open to History', async () => {
    const before = await getRecurringOrders({
      walletAddress: WALLET_ADDRESS,
      status: [RecurringOrderStatus.Open],
    });

    await cancelRecurringOrder(MOCK_RECURRING_OPEN_ORDER.orderId);

    const openOrders = await getRecurringOrders({
      walletAddress: WALLET_ADDRESS,
      status: [RecurringOrderStatus.Open],
    });
    const historyOrders = await getRecurringOrders({
      walletAddress: WALLET_ADDRESS,
      status: [RecurringOrderStatus.Completed, RecurringOrderStatus.Cancelled],
    });

    expect(before.orders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          orderId: MOCK_RECURRING_OPEN_ORDER.orderId,
        }),
      ]),
    );
    expect(openOrders.orders).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          orderId: MOCK_RECURRING_OPEN_ORDER.orderId,
        }),
      ]),
    );
    expect(historyOrders.orders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          orderId: MOCK_RECURRING_OPEN_ORDER.orderId,
          status: RecurringOrderStatus.Cancelled,
        }),
      ]),
    );
  });

  it.each<[string, string]>([
    ['unknown-order', 'order_not_found'],
    [MOCK_RECURRING_CANCELLED_ORDER.orderId, 'order_not_open'],
    [MOCK_RECURRING_COMPLETED_ORDER.orderId, 'order_not_open'],
  ])('rejects %s with %s', async (orderId, errorMessage) => {
    await expect(cancelRecurringOrder(orderId)).rejects.toThrow(errorMessage);

    const openOrders = await getRecurringOrders({
      walletAddress: WALLET_ADDRESS,
      status: [RecurringOrderStatus.Open],
    });
    expect(openOrders.orders).toHaveLength(3);
  });

  it('rejects a second cancellation without changing order responses', async () => {
    await cancelRecurringOrder(MOCK_RECURRING_OPEN_ORDER.orderId);

    const openOrdersBeforeRetry = await getRecurringOrders({
      walletAddress: WALLET_ADDRESS,
      status: [RecurringOrderStatus.Open],
    });
    const historyBeforeRetry = await getRecurringOrders({
      walletAddress: WALLET_ADDRESS,
      status: [RecurringOrderStatus.Completed, RecurringOrderStatus.Cancelled],
    });

    await expect(
      cancelRecurringOrder(MOCK_RECURRING_OPEN_ORDER.orderId),
    ).rejects.toThrow('order_not_open');

    await expect(
      getRecurringOrders({
        walletAddress: WALLET_ADDRESS,
        status: [RecurringOrderStatus.Open],
      }),
    ).resolves.toStrictEqual(openOrdersBeforeRetry);
    await expect(
      getRecurringOrders({
        walletAddress: WALLET_ADDRESS,
        status: [
          RecurringOrderStatus.Completed,
          RecurringOrderStatus.Cancelled,
        ],
      }),
    ).resolves.toStrictEqual(historyBeforeRetry);
  });
});

describe('getRecurringSwaps', () => {
  const orderId = MOCK_RECURRING_OPEN_ORDER_SWAPS[0].orderId;

  it('returns attempted swaps newest first', async () => {
    const result = await getRecurringSwaps(orderId);

    expect(result.swaps.map(({ swapId }) => swapId)).toStrictEqual(
      [...MOCK_RECURRING_OPEN_ORDER_SWAPS]
        .reverse()
        .map(({ swapId }) => swapId),
    );
  });

  it('fetches the page identified by the previous cursor', async () => {
    const firstPage = await getRecurringSwaps(orderId, { limit: 2 });
    const secondPage = await getRecurringSwaps(orderId, {
      limit: 2,
      cursor: firstPage.nextCursor,
    });

    expect(firstPage.swaps.map(({ swapId }) => swapId)).toStrictEqual([
      `${orderId}-6`,
      `${orderId}-5`,
    ]);
    expect(secondPage.swaps.map(({ swapId }) => swapId)).toStrictEqual([
      `${orderId}-4`,
      `${orderId}-3`,
    ]);
  });

  it('omits the cursor on the final page', async () => {
    const result = await getRecurringSwaps(orderId, {
      limit: 2,
      cursor: '5',
    });

    expect(result.swaps).toHaveLength(1);
    expect(result.nextCursor).toBeUndefined();
  });

  it('returns non-resolvable mock hashes for completed swaps', async () => {
    const result = await getRecurringSwaps(
      MOCK_RECURRING_COMPLETED_ORDER.orderId,
    );

    for (const swap of result.swaps) {
      expect(swap.status).toBe(RecurringSwapStatus.Filled);
      expect(swap.txHash).toMatch(/^0x/u);
      expect(swap.txHash).not.toMatch(/^0x[0-9a-f]{64}$/iu);
    }
  });

  it('rejects an unknown order id', async () => {
    await expect(getRecurringSwaps('unknown-order')).rejects.toThrow(
      'order_not_found',
    );
  });
});
