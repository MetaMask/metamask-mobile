import {
  RECURRING_ORDERS_BY_ASSET_QUERY_KEY,
  RECURRING_ORDERS_STALE_TIME,
  recurringOrdersQueries,
} from './recurringOrders';

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

  it('uses the recurring-orders stale time', () => {
    const descriptor = recurringOrdersQueries.getRecurringOrdersByAsset({
      walletAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      assetId: 'eip155:1/slip44:60',
    });

    expect(descriptor.staleTime).toBe(RECURRING_ORDERS_STALE_TIME);
  });
});
