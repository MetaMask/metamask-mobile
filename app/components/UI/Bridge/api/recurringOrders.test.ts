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
  MOCK_RECURRING_OPEN_ORDER,
  MOCK_RECURRING_OPEN_ORDER_2,
  MOCK_RECURRING_OPEN_ORDER_3,
  MOCK_RECURRING_WALLET_ADDRESS,
} from './recurringOrders.mock';
import { MOCK_RECURRING_OPEN_ORDER_SWAPS } from './recurringSwaps.mock';
import { RecurringOrderState } from './recurringOrders.types';

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
        walletAddress: MOCK_RECURRING_WALLET_ADDRESS,
        orderStates: [
          RecurringOrderState.Completed,
          RecurringOrderState.Cancelled,
        ],
        chainId: 'eip155:1',
        assetId: MOCK_RECURRING_OPEN_ORDER.src.asset.assetId,
        limit: 1,
      });
      const secondPage = await getRecurringOrders({
        walletAddress: MOCK_RECURRING_WALLET_ADDRESS,
        orderStates: [
          RecurringOrderState.Completed,
          RecurringOrderState.Cancelled,
        ],
        chainId: 'eip155:1',
        assetId: MOCK_RECURRING_OPEN_ORDER.src.asset.assetId,
        limit: 1,
        cursor: firstPage.nextCursor,
      });

      expect(firstPage).toStrictEqual({
        orders: [MOCK_RECURRING_COMPLETED_ORDER],
        nextCursor: '1',
      });
      expect(secondPage).toStrictEqual({
        orders: [MOCK_RECURRING_CANCELLED_ORDER],
      });
      expect(globalFetchSpy).not.toHaveBeenCalled();
    });

    it('omits the normalized cursor on the final page', async () => {
      const result = await getRecurringOrders({
        walletAddress: MOCK_RECURRING_WALLET_ADDRESS,
      });

      expect(result.nextCursor).toBeUndefined();
      expect(result.orders).toHaveLength(6);
    });

    it('scopes canonical mock orders to the requested wallet', async () => {
      const walletAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      const result = await getRecurringOrders({
        walletAddress,
      });

      expect(result.orders).toHaveLength(6);
      expect(
        result.orders.every(
          ({ account }) => account === `eip155:1:${walletAddress}`,
        ),
      ).toBe(true);
    });
  });

  describe('getRecurringOrdersByAsset', () => {
    it('returns the latest open canonical mock for the asset', async () => {
      const result = await getRecurringOrdersByAsset({
        walletAddress: MOCK_RECURRING_WALLET_ADDRESS,
        assetId: MOCK_RECURRING_OPEN_ORDER.src.asset.assetId,
      });

      expect(result).toStrictEqual([MOCK_RECURRING_OPEN_ORDER_3]);
    });
  });

  describe('getRecurringSwaps', () => {
    it('sorts and paginates canonical mock swaps', async () => {
      const firstPage = await getRecurringSwaps(MOCK_RECURRING_OPEN_ORDER.id, {
        limit: 2,
      });
      const secondPage = await getRecurringSwaps(MOCK_RECURRING_OPEN_ORDER.id, {
        limit: 2,
        cursor: firstPage.nextCursor,
      });

      expect(firstPage).toStrictEqual({
        swaps: [
          MOCK_RECURRING_OPEN_ORDER_SWAPS[5],
          MOCK_RECURRING_OPEN_ORDER_SWAPS[4],
        ],
        nextCursor: '2',
      });
      expect(secondPage.swaps).toStrictEqual([
        MOCK_RECURRING_OPEN_ORDER_SWAPS[3],
        MOCK_RECURRING_OPEN_ORDER_SWAPS[2],
      ]);
    });
  });

  describe('cancelRecurringOrder', () => {
    it('moves the canonical mock order to cancelled state', async () => {
      const result = await cancelRecurringOrder(
        MOCK_RECURRING_OPEN_ORDER.id,
        MOCK_RECURRING_OPEN_ORDER.account,
      );
      const cancelledOrders = await getRecurringOrders({
        walletAddress: MOCK_RECURRING_WALLET_ADDRESS,
        orderStates: [RecurringOrderState.Cancelled],
      });

      expect(result.order.state).toBe(RecurringOrderState.Cancelled);
      expect(cancelledOrders.orders.map(({ id }) => id)).toContain(
        MOCK_RECURRING_OPEN_ORDER.id,
      );
      expect(globalFetchSpy).not.toHaveBeenCalled();
    });

    it('rejects cancellation of a non-open mock order', async () => {
      await expect(
        cancelRecurringOrder(
          MOCK_RECURRING_CANCELLED_ORDER.id,
          MOCK_RECURRING_CANCELLED_ORDER.account,
        ),
      ).rejects.toThrow('order_not_cancellable');
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
