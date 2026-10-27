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
import {
  MOCK_RECURRING_OPEN_ORDER_SWAPS,
  MOCK_RECURRING_SWAPS_BY_ORDER_ID,
} from './recurringSwaps.mock';
import { RecurringOrderState } from './recurringOrders.types';

const UNMATCHED_ASSET_ID =
  'eip155:1/erc20:0x0000000000000000000000000000000000000001';

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

    it('keeps orders whose destination asset matches with different checksum casing', async () => {
      const destinationAssetId =
        MOCK_RECURRING_OPEN_ORDER.dest.asset.assetId.replace(
          /0x[a-f0-9]+$/u,
          (address) => address.toUpperCase(),
        );

      const result = await getRecurringOrders({
        walletAddress: MOCK_RECURRING_WALLET_ADDRESS,
        assetId: destinationAssetId,
      });

      expect(result.orders.map(({ id }) => id)).not.toContain(
        MOCK_RECURRING_OPEN_ORDER_2.id,
      );
      expect(result.orders).toHaveLength(5);
    });

    it('returns no orders when the asset id is not a CAIP asset type', async () => {
      const result = await getRecurringOrders({
        walletAddress: MOCK_RECURRING_WALLET_ADDRESS,
        assetId: 'not-an-asset',
      });

      expect(result.orders).toStrictEqual([]);
    });

    it('returns no orders when neither side matches the asset', async () => {
      const result = await getRecurringOrders({
        walletAddress: MOCK_RECURRING_WALLET_ADDRESS,
        assetId: UNMATCHED_ASSET_ID,
      });

      expect(result.orders).toStrictEqual([]);
    });

    it('returns orders on the requested chain', async () => {
      const result = await getRecurringOrders({
        walletAddress: MOCK_RECURRING_WALLET_ADDRESS,
        chainId: 'eip155:56',
      });

      expect(result.orders).toStrictEqual([
        expect.objectContaining({
          id: MOCK_RECURRING_OPEN_ORDER_2.id,
          account: `eip155:1:${MOCK_RECURRING_WALLET_ADDRESS}`,
        }),
      ]);
    });

    it('returns no orders for a chain with no mock orders', async () => {
      const result = await getRecurringOrders({
        walletAddress: MOCK_RECURRING_WALLET_ADDRESS,
        chainId: 'eip155:137',
      });

      expect(result.orders).toStrictEqual([]);
    });

    it('returns no orders when no order state matches', async () => {
      const result = await getRecurringOrders({
        walletAddress: MOCK_RECURRING_WALLET_ADDRESS,
        orderStates: [],
      });

      expect(result.orders).toStrictEqual([]);
    });

    it('returns an empty page when the cursor is past the last order', async () => {
      const result = await getRecurringOrders({
        walletAddress: MOCK_RECURRING_WALLET_ADDRESS,
        cursor: '6',
      });

      expect(result).toStrictEqual({ orders: [] });
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

    it('returns every swap without a cursor when the page fits the default limit', async () => {
      const result = await getRecurringSwaps(MOCK_RECURRING_OPEN_ORDER.id);

      expect(result.swaps).toHaveLength(MOCK_RECURRING_OPEN_ORDER_SWAPS.length);
      expect(result.nextCursor).toBeUndefined();
    });

    it('omits the cursor on the last swaps page', async () => {
      const result = await getRecurringSwaps(MOCK_RECURRING_OPEN_ORDER.id, {
        limit: 4,
        cursor: '4',
      });

      expect(result.swaps).toHaveLength(2);
      expect(result.nextCursor).toBeUndefined();
    });

    it('returns an empty page for an order with no swaps', async () => {
      const result = await getRecurringSwaps(MOCK_RECURRING_OPEN_ORDER_2.id);

      expect(result).toStrictEqual({ swaps: [] });
    });

    it('rejects an unknown order', async () => {
      await expect(getRecurringSwaps('missing-order')).rejects.toThrow(
        'order_not_found',
      );
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

    it('rejects an unknown order', async () => {
      await expect(
        cancelRecurringOrder(
          'missing-order',
          MOCK_RECURRING_OPEN_ORDER.account,
        ),
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
