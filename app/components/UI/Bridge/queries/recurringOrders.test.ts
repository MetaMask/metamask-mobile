import {
  RECURRING_ORDERS_BY_ASSET_QUERY_KEY,
  RECURRING_ORDERS_QUERY_KEY,
  RECURRING_ORDERS_STALE_TIME,
  recurringOrdersQueries,
} from './recurringOrders';
import { MOCK_RECURRING_OPEN_ORDER } from '../api/recurringOrders.mock';

describe('recurringOrdersQueries.getRecurringOrders', () => {
  it('preserves the asset filter in the query key', () => {
    const assetId = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';

    const descriptor = recurringOrdersQueries.getRecurringOrders({
      walletAddress: '0xABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCD',
      assetId,
    });

    expect(descriptor.queryKey).toStrictEqual([
      RECURRING_ORDERS_QUERY_KEY,
      {
        walletAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        assetId,
      },
    ]);
    expect(descriptor.staleTime).toBe(0);
  });
});

describe('recurringOrdersQueries.getRecurringOrder', () => {
  it('keys the query by order and account without caching the response', () => {
    const descriptor = recurringOrdersQueries.getRecurringOrder(
      MOCK_RECURRING_OPEN_ORDER.id,
      { accountAddress: MOCK_RECURRING_OPEN_ORDER.account },
    );

    expect(descriptor).toStrictEqual({
      queryKey: [
        'RecurringOrdersDataService:getRecurringOrder',
        MOCK_RECURRING_OPEN_ORDER.id,
        {
          accountAddress: MOCK_RECURRING_OPEN_ORDER.account,
        },
      ],
      staleTime: 0,
    });
  });
});

describe('recurringOrdersQueries.getRecurringOrdersByAsset', () => {
  it('keys the query by normalized wallet and exact asset ID', () => {
    const assetId = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';

    const descriptor = recurringOrdersQueries.getRecurringOrdersByAsset({
      walletAddress: '0xABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCD',
      assetId,
    });

    expect(descriptor.queryKey).toStrictEqual([
      RECURRING_ORDERS_BY_ASSET_QUERY_KEY,
      {
        walletAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        assetId,
      },
    ]);
  });

  it('does not cache the latest order by asset', () => {
    const descriptor = recurringOrdersQueries.getRecurringOrdersByAsset({
      walletAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      assetId: 'eip155:1/slip44:60',
    });

    expect(descriptor.staleTime).toBe(0);
  });
});

describe('recurringOrdersQueries.getRecurringSwaps', () => {
  it('does not cache swaps', () => {
    const descriptor = recurringOrdersQueries.getRecurringSwaps(
      MOCK_RECURRING_OPEN_ORDER.id,
      { accountAddress: MOCK_RECURRING_OPEN_ORDER.account },
    );

    expect(descriptor.staleTime).toBe(RECURRING_ORDERS_STALE_TIME);
    expect(descriptor.staleTime).toBe(0);
  });
});
