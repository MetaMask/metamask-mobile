import {
  MOCK_LIMIT_EXPIRED_ORDER,
  MOCK_LIMIT_FILLED_ORDER,
  MOCK_LIMIT_OPEN_ORDER,
} from '../../api/limitOrders/getLimitOrders/mock';
import {
  createLimitOrdersTab,
  getHistoryLimitOrderDate,
  getOpenLimitOrderDate,
} from './createLimitOrdersTab';

describe('createLimitOrdersTab', () => {
  it('maps orders and loading state onto an OrdersTabConfig', () => {
    const onRetry = jest.fn();

    const tab = createLimitOrdersTab({
      orders: [MOCK_LIMIT_OPEN_ORDER],
      isLoading: true,
      isError: false,
      isFetchingNextPage: false,
      onRetry,
      getItemDate: getOpenLimitOrderDate,
    });

    expect(tab.items).toStrictEqual([MOCK_LIMIT_OPEN_ORDER]);
    expect(tab.isLoading).toBe(true);
    expect(tab.onRetry).toBe(onRetry);
    expect(tab.keyExtractor?.(MOCK_LIMIT_OPEN_ORDER, 0)).toBe(
      MOCK_LIMIT_OPEN_ORDER.id,
    );
    expect(tab.getItemDate).toBe(getOpenLimitOrderDate);
  });
});

describe('getOpenLimitOrderDate', () => {
  it('returns the order creation time', () => {
    const date = getOpenLimitOrderDate(MOCK_LIMIT_OPEN_ORDER);

    expect(date).toBe(MOCK_LIMIT_OPEN_ORDER.timingData.createdAt);
  });
});

describe('getHistoryLimitOrderDate', () => {
  it('returns closedAt so the section matches the date on the row', () => {
    const date = getHistoryLimitOrderDate(MOCK_LIMIT_FILLED_ORDER);

    expect(date).toBe(MOCK_LIMIT_FILLED_ORDER.timingData.closedAt);
  });

  it('falls back to expiresAt when the order has no closedAt', () => {
    const order = {
      ...MOCK_LIMIT_EXPIRED_ORDER,
      timingData: {
        createdAt: MOCK_LIMIT_EXPIRED_ORDER.timingData.createdAt,
        expiresAt: MOCK_LIMIT_EXPIRED_ORDER.timingData.expiresAt,
      },
    };

    const date = getHistoryLimitOrderDate(order);

    expect(date).toBe(order.timingData.expiresAt);
  });
});
