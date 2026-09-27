import { MOCK_LIMIT_OPEN_ORDER } from '../../api/limitOrders/getLimitOrders/mock';
import { createLimitOrdersTab } from './createLimitOrdersTab';

describe('createLimitOrdersTab', () => {
  it('maps orders and loading state onto an OrdersTabConfig', () => {
    const onRetry = jest.fn();
    const tab = createLimitOrdersTab({
      orders: [MOCK_LIMIT_OPEN_ORDER],
      isLoading: true,
      isError: false,
      isFetchingNextPage: false,
      onRetry,
    });

    expect(tab.items).toStrictEqual([MOCK_LIMIT_OPEN_ORDER]);
    expect(tab.isLoading).toBe(true);
    expect(tab.onRetry).toBe(onRetry);
    expect(tab.keyExtractor?.(MOCK_LIMIT_OPEN_ORDER, 0)).toBe(
      MOCK_LIMIT_OPEN_ORDER.id,
    );
  });
});
