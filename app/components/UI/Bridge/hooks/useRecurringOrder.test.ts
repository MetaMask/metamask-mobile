import { useQuery } from '@metamask/react-data-query';
import { renderHook } from '@testing-library/react-native';
import { MOCK_RECURRING_OPEN_ORDER } from '../api/recurringOrders.mock';
import { useRecurringOrder } from './useRecurringOrder';

jest.mock('@metamask/react-data-query', () => ({
  useQuery: jest.fn(),
}));

const mockUseQuery = jest.mocked(useQuery);
const refetch = jest.fn();

describe('useRecurringOrder', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch,
    } as never);
  });

  it('queries the data service by order and account', () => {
    renderHook(() =>
      useRecurringOrder({
        orderId: MOCK_RECURRING_OPEN_ORDER.id,
        accountAddress: MOCK_RECURRING_OPEN_ORDER.account,
      }),
    );

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: [
        'RecurringOrdersDataService:getRecurringOrder',
        MOCK_RECURRING_OPEN_ORDER.id,
        { accountAddress: MOCK_RECURRING_OPEN_ORDER.account },
      ],
      enabled: true,
    });
  });

  it('does not fetch without complete params', () => {
    renderHook(() => useRecurringOrder({}));

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('returns the order and query state from the data service response', () => {
    mockUseQuery.mockReturnValue({
      data: { order: MOCK_RECURRING_OPEN_ORDER },
      isLoading: false,
      isError: false,
      refetch,
    } as never);

    const { result } = renderHook(() =>
      useRecurringOrder({
        orderId: MOCK_RECURRING_OPEN_ORDER.id,
        accountAddress: MOCK_RECURRING_OPEN_ORDER.account,
      }),
    );

    expect(result.current).toStrictEqual({
      order: MOCK_RECURRING_OPEN_ORDER,
      isLoading: false,
      isError: false,
      refetch,
    });
  });
});
