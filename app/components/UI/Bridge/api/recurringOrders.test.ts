import {
  cancelRecurringOrder,
  createRecurringOrder,
  getRecurringOrders,
  getRecurringOrdersByAsset,
  getRecurringSwaps,
  resetRecurringOrdersMockState,
} from './recurringOrders';
import {
  MOCK_RECURRING_CANCELLED_ORDER,
  MOCK_RECURRING_COMPLETED_ORDER,
  MOCK_RECURRING_EXPIRED_ORDER,
  MOCK_RECURRING_OPEN_ORDER,
  MOCK_RECURRING_OPEN_ORDER_2,
  MOCK_RECURRING_OPEN_ORDER_3,
  MOCK_RECURRING_ACCOUNT,
  MOCK_RECURRING_WALLET_ADDRESS,
} from './recurringOrders.mock';
import {
  MOCK_RECURRING_OPEN_ORDER_SWAPS,
  MOCK_RECURRING_SWAPS_BY_ORDER_ID,
} from './recurringSwaps.mock';
import { RecurringOrderState } from './recurringOrders.types';

const UNMATCHED_ASSET_ID =
  'eip155:1/erc20:0x0000000000000000000000000000000000000001';
const ALTERNATE_WALLET_ADDRESS = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
const ALTERNATE_ETHEREUM_ACCOUNT =
  'eip155:1:0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
const ALTERNATE_BNB_ACCOUNT =
  'eip155:56:0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

describe('recurring orders API', () => {
  let globalFetchSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    resetRecurringOrdersMockState();
    globalFetchSpy = jest
      .spyOn(global, 'fetch')
      .mockRejectedValue(new Error('Unexpected network request'));
  });

  afterEach(() => {
    globalFetchSpy.mockRestore();
  });

  describe('getRecurringOrders', () => {
    it('filters canonical mock orders and paginates with opaque cursors', async () => {
      const firstPage = await getRecurringOrders({
        accountAddress: MOCK_RECURRING_ACCOUNT,
        states: [RecurringOrderState.Completed, RecurringOrderState.Cancelled],
        chainIds: ['eip155:1'],
        asset: MOCK_RECURRING_OPEN_ORDER.src.asset.assetId,
        limit: 1,
      });
      const secondPage = await getRecurringOrders({
        accountAddress: MOCK_RECURRING_ACCOUNT,
        states: [RecurringOrderState.Completed, RecurringOrderState.Cancelled],
        chainIds: ['eip155:1'],
        asset: MOCK_RECURRING_OPEN_ORDER.src.asset.assetId,
        limit: 1,
        after: firstPage.endCursor,
      });

      expect(firstPage).toStrictEqual({
        orders: [MOCK_RECURRING_COMPLETED_ORDER],
        endCursor: '1',
        hasNextPage: true,
      });
      expect(secondPage).toStrictEqual({
        orders: [MOCK_RECURRING_CANCELLED_ORDER],
        hasNextPage: false,
      });
      expect(globalFetchSpy).not.toHaveBeenCalled();
    });

    it('omits the normalized cursor on the final page', async () => {
      const result = await getRecurringOrders({
        accountAddress: MOCK_RECURRING_ACCOUNT,
      });

      expect(result.endCursor).toBeUndefined();
      expect(result.hasNextPage).toBe(false);
      expect(result.orders).toHaveLength(6);
    });

    it('adapts mock accounts to the requested wallet and order chain', async () => {
      const result = await getRecurringOrders({
        accountAddress: ALTERNATE_ETHEREUM_ACCOUNT,
      });

      expect(
        result.orders.find(({ id }) => id === MOCK_RECURRING_OPEN_ORDER.id)
          ?.accountAddress,
      ).toBe(ALTERNATE_ETHEREUM_ACCOUNT);
      expect(
        result.orders.find(({ id }) => id === MOCK_RECURRING_OPEN_ORDER_2.id)
          ?.accountAddress,
      ).toBe(ALTERNATE_BNB_ACCOUNT);
    });

    it('keeps orders whose destination asset matches with different checksum casing', async () => {
      const destinationAssetId =
        'eip155:1/erc20:0xA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48';

      const result = await getRecurringOrders({
        accountAddress: MOCK_RECURRING_ACCOUNT,
        asset: destinationAssetId,
      });

      expect(result.orders.map(({ id }) => id)).not.toContain(
        MOCK_RECURRING_OPEN_ORDER_2.id,
      );
      expect(result.orders).toHaveLength(5);
    });

    it('returns no orders when neither side matches the asset', async () => {
      const result = await getRecurringOrders({
        accountAddress: MOCK_RECURRING_ACCOUNT,
        asset: UNMATCHED_ASSET_ID,
      });

      expect(result.orders).toStrictEqual([]);
    });

    it('returns orders on the requested chain', async () => {
      const result = await getRecurringOrders({
        accountAddress: MOCK_RECURRING_ACCOUNT,
        chainIds: ['eip155:56'],
      });

      expect(result.orders).toStrictEqual([
        expect.objectContaining({
          id: MOCK_RECURRING_OPEN_ORDER_2.id,
          accountAddress: MOCK_RECURRING_OPEN_ORDER_2.accountAddress,
        }),
      ]);
    });

    it('returns no orders for a chain with no mock orders', async () => {
      const result = await getRecurringOrders({
        accountAddress: MOCK_RECURRING_ACCOUNT,
        chainIds: ['eip155:137'],
      });

      expect(result.orders).toStrictEqual([]);
    });

    it('returns no orders when no order state matches', async () => {
      const result = await getRecurringOrders({
        accountAddress: MOCK_RECURRING_ACCOUNT,
        states: [],
      });

      expect(result.orders).toStrictEqual([]);
    });

    it('returns an empty page when the cursor is past the last order', async () => {
      const result = await getRecurringOrders({
        accountAddress: MOCK_RECURRING_ACCOUNT,
        after: '6',
      });

      expect(result).toStrictEqual({ orders: [], hasNextPage: false });
    });
  });

  describe('getRecurringOrdersByAsset', () => {
    it('returns the latest open canonical mock for the asset', async () => {
      const result = await getRecurringOrdersByAsset({
        walletAddress: ALTERNATE_WALLET_ADDRESS,
        assetId: MOCK_RECURRING_OPEN_ORDER.src.asset.assetId,
      });

      expect(result).toStrictEqual([
        {
          ...MOCK_RECURRING_OPEN_ORDER_3,
          accountAddress: ALTERNATE_ETHEREUM_ACCOUNT,
        },
      ]);
    });

    it('returns no open orders for an unmatched asset', async () => {
      const result = await getRecurringOrdersByAsset({
        walletAddress: MOCK_RECURRING_WALLET_ADDRESS,
        assetId: UNMATCHED_ASSET_ID,
      });

      expect(result).toStrictEqual([]);
    });
  });

  describe('getRecurringSwaps', () => {
    it('sorts and paginates canonical mock swaps', async () => {
      const firstPage = await getRecurringSwaps(MOCK_RECURRING_OPEN_ORDER.id, {
        accountAddress: MOCK_RECURRING_OPEN_ORDER.accountAddress,
        limit: 2,
      });
      const secondPage = await getRecurringSwaps(MOCK_RECURRING_OPEN_ORDER.id, {
        accountAddress: MOCK_RECURRING_OPEN_ORDER.accountAddress,
        limit: 2,
        after: firstPage.endCursor,
      });

      expect(firstPage).toStrictEqual({
        swaps: [
          MOCK_RECURRING_OPEN_ORDER_SWAPS[5],
          MOCK_RECURRING_OPEN_ORDER_SWAPS[4],
        ],
        endCursor: '2',
        hasNextPage: true,
      });
      expect(secondPage.swaps).toStrictEqual([
        MOCK_RECURRING_OPEN_ORDER_SWAPS[3],
        MOCK_RECURRING_OPEN_ORDER_SWAPS[2],
      ]);
    });

    it('returns every swap without a cursor when the page fits the default limit', async () => {
      const result = await getRecurringSwaps(MOCK_RECURRING_OPEN_ORDER.id, {
        accountAddress: ALTERNATE_ETHEREUM_ACCOUNT,
      });

      expect(result.swaps).toHaveLength(MOCK_RECURRING_OPEN_ORDER_SWAPS.length);
      expect(result.endCursor).toBeUndefined();
      expect(result.hasNextPage).toBe(false);
    });

    it('omits the cursor on the last swaps page', async () => {
      const result = await getRecurringSwaps(MOCK_RECURRING_OPEN_ORDER.id, {
        accountAddress: MOCK_RECURRING_OPEN_ORDER.accountAddress,
        limit: 4,
        after: '4',
      });

      expect(result.swaps).toHaveLength(2);
      expect(result.endCursor).toBeUndefined();
    });

    it('returns an empty page for an order with no swaps', async () => {
      const result = await getRecurringSwaps(MOCK_RECURRING_OPEN_ORDER_2.id, {
        accountAddress: MOCK_RECURRING_OPEN_ORDER_2.accountAddress,
      });

      expect(result).toStrictEqual({ swaps: [], hasNextPage: false });
    });

    it('rejects an unknown order', async () => {
      await expect(
        getRecurringSwaps('missing-order', {
          accountAddress: MOCK_RECURRING_OPEN_ORDER.accountAddress,
        }),
      ).rejects.toThrow('order_not_found');
    });

    it('sorts swaps that have not executed by their scheduled time', async () => {
      const swaps =
        MOCK_RECURRING_SWAPS_BY_ORDER_ID[MOCK_RECURRING_OPEN_ORDER.id];
      const earlierPendingSwap = {
        ...swaps[0],
        id: `${swaps[0].id}-pending-earlier`,
        timingData: { scheduledAt: '2026-09-06T11:00:00.000Z' },
      };
      const laterPendingSwap = {
        ...swaps[0],
        id: `${swaps[0].id}-pending-later`,
        timingData: { scheduledAt: '2026-09-06T12:00:00.000Z' },
      };
      swaps.push(earlierPendingSwap, laterPendingSwap);

      try {
        const result = await getRecurringSwaps(MOCK_RECURRING_OPEN_ORDER.id, {
          accountAddress: MOCK_RECURRING_OPEN_ORDER.accountAddress,
          limit: 2,
        });

        expect(result.swaps.map(({ id }) => id)).toStrictEqual([
          laterPendingSwap.id,
          earlierPendingSwap.id,
        ]);
      } finally {
        swaps.splice(swaps.length - 2, 2);
      }
    });
  });

  describe('cancelRecurringOrder', () => {
    it('moves the canonical mock order to cancelled state', async () => {
      const result = await cancelRecurringOrder(MOCK_RECURRING_OPEN_ORDER.id, {
        accountAddress: ALTERNATE_ETHEREUM_ACCOUNT,
      });
      const cancelledOrders = await getRecurringOrders({
        accountAddress: ALTERNATE_ETHEREUM_ACCOUNT,
        states: [RecurringOrderState.Cancelled],
      });

      expect(result.order.state).toBe(RecurringOrderState.Cancelled);
      expect(result.order.accountAddress).toBe(ALTERNATE_ETHEREUM_ACCOUNT);
      expect(result.order.isCancellable).toBe(false);
      expect(result.order.timingData.closedAt).toBeDefined();
      expect(cancelledOrders.orders.map(({ id }) => id)).toContain(
        MOCK_RECURRING_OPEN_ORDER.id,
      );
      expect(globalFetchSpy).not.toHaveBeenCalled();
    });

    it('returns an already-cancelled mock order unchanged', async () => {
      const result = await cancelRecurringOrder(
        MOCK_RECURRING_CANCELLED_ORDER.id,
        { accountAddress: MOCK_RECURRING_CANCELLED_ORDER.accountAddress },
      );

      expect(result.order).toStrictEqual(MOCK_RECURRING_CANCELLED_ORDER);
    });

    it.each([MOCK_RECURRING_COMPLETED_ORDER, MOCK_RECURRING_EXPIRED_ORDER])(
      'rejects non-cancellable order $id',
      async (order) => {
        await expect(
          cancelRecurringOrder(order.id, {
            accountAddress: order.accountAddress,
          }),
        ).rejects.toThrow('order_not_cancellable');
      },
    );

    it('rejects an unknown order', async () => {
      await expect(
        cancelRecurringOrder('missing-order', {
          accountAddress: MOCK_RECURRING_OPEN_ORDER.accountAddress,
        }),
      ).rejects.toThrow('order_not_found');
    });
  });

  describe('createRecurringOrder', () => {
    it('returns the canonical mock while the API flag is disabled', async () => {
      const result = await createRecurringOrder();

      expect(result.order).toStrictEqual(MOCK_RECURRING_OPEN_ORDER);
      expect(globalFetchSpy).not.toHaveBeenCalled();
    });
  });
});
