import { renderHook } from '@testing-library/react-native';
import { MOCK_LIMIT_OPEN_ORDER } from '../api/limitOrders/getLimitOrders/mock';
import { MOCK_RECURRING_OPEN_ORDER } from '../api/recurringOrders.mock';
import { OPEN_LIMIT_ORDER_STATES } from '../constants/limitOrders';
import { BridgeTabKey } from '../Views/BridgeView/BridgeView.constants';
import { useLatestOpenRecurringOrderForAsset } from './useLatestOpenRecurringOrderForAsset';
import { useLimitOrders } from './useLimitOrders';
import { useMostRecentOrder } from './useMostRecentOrder';

jest.mock('./useLatestOpenRecurringOrderForAsset');
jest.mock('./useLimitOrders');

const mockUseLatestOpenRecurringOrderForAsset = jest.mocked(
  useLatestOpenRecurringOrderForAsset,
);
const mockUseLimitOrders = jest.mocked(useLimitOrders);
const WALLET_ADDRESS = '0x1234567890123456789012345678901234567890';
const ASSET_ID = MOCK_RECURRING_OPEN_ORDER.src.asset.assetId;

function setupRecurringOrderQuery(
  overrides: Partial<
    ReturnType<typeof useLatestOpenRecurringOrderForAsset>
  > = {},
) {
  mockUseLatestOpenRecurringOrderForAsset.mockReturnValue({
    order: undefined,
    isLoading: false,
    isError: false,
    ...overrides,
  });
}

function setupLimitOrdersQuery(
  overrides: Partial<ReturnType<typeof useLimitOrders>> = {},
) {
  mockUseLimitOrders.mockReturnValue({
    orders: [],
    total: undefined,
    isLoading: false,
    isError: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
    refetch: jest.fn(),
    refresh: jest.fn(),
    ...overrides,
  });
}

function renderMostRecentOrder(
  overrides: Partial<Parameters<typeof useMostRecentOrder>[0]> = {},
) {
  return renderHook(() =>
    useMostRecentOrder({
      walletAddress: WALLET_ADDRESS,
      assetId: ASSET_ID,
      isLimitOrderEnabled: true,
      isRecurringOrderEnabled: true,
      ...overrides,
    }),
  );
}

describe('useMostRecentOrder', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    setupRecurringOrderQuery();
    setupLimitOrdersQuery();
  });

  it('composes recurring and one-item asset-filtered open limit lookups', () => {
    renderMostRecentOrder();

    expect(mockUseLatestOpenRecurringOrderForAsset).toHaveBeenCalledWith({
      walletAddress: WALLET_ADDRESS,
      assetId: ASSET_ID,
      enabled: true,
    });
    expect(mockUseLimitOrders).toHaveBeenCalledWith({
      walletAddress: WALLET_ADDRESS,
      assetId: ASSET_ID,
      states: OPEN_LIMIT_ORDER_STATES,
      limit: 1,
      enabled: true,
    });
  });

  it('keeps recurring lookup enabled when limit orders are disabled', () => {
    setupRecurringOrderQuery({ order: MOCK_RECURRING_OPEN_ORDER });
    setupLimitOrdersQuery({ orders: [MOCK_LIMIT_OPEN_ORDER] });

    const { result } = renderMostRecentOrder({ isLimitOrderEnabled: false });

    expect(result.current.mostRecentOrder).toStrictEqual({
      type: BridgeTabKey.Recurring,
      order: MOCK_RECURRING_OPEN_ORDER,
    });
    expect(mockUseLatestOpenRecurringOrderForAsset).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true }),
    );
    expect(mockUseLimitOrders).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('keeps limit lookup enabled when recurring orders are disabled', () => {
    setupRecurringOrderQuery({ order: MOCK_RECURRING_OPEN_ORDER });
    setupLimitOrdersQuery({ orders: [MOCK_LIMIT_OPEN_ORDER] });

    const { result } = renderMostRecentOrder({
      isRecurringOrderEnabled: false,
    });

    expect(result.current.mostRecentOrder).toStrictEqual({
      type: BridgeTabKey.Limit,
      order: MOCK_LIMIT_OPEN_ORDER,
    });
    expect(mockUseLatestOpenRecurringOrderForAsset).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
    expect(mockUseLimitOrders).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true }),
    );
  });

  it('returns the limit order when it is the only order', () => {
    setupLimitOrdersQuery({ orders: [MOCK_LIMIT_OPEN_ORDER] });

    const { result } = renderMostRecentOrder();

    expect(result.current.mostRecentOrder).toStrictEqual({
      type: BridgeTabKey.Limit,
      order: MOCK_LIMIT_OPEN_ORDER,
    });
  });

  it('returns the recurring order when it is the only order', () => {
    setupRecurringOrderQuery({ order: MOCK_RECURRING_OPEN_ORDER });

    const { result } = renderMostRecentOrder();

    expect(result.current.mostRecentOrder).toStrictEqual({
      type: BridgeTabKey.Recurring,
      order: MOCK_RECURRING_OPEN_ORDER,
    });
  });

  it('returns the newer limit order', () => {
    setupRecurringOrderQuery({ order: MOCK_RECURRING_OPEN_ORDER });
    setupLimitOrdersQuery({ orders: [MOCK_LIMIT_OPEN_ORDER] });

    const { result } = renderMostRecentOrder();

    expect(result.current.mostRecentOrder?.type).toBe(BridgeTabKey.Limit);
  });

  it('returns the newer recurring order', () => {
    const newerRecurringOrder = {
      ...MOCK_RECURRING_OPEN_ORDER,
      createdAt: '2026-10-01T12:00:00.000Z',
    };
    setupRecurringOrderQuery({ order: newerRecurringOrder });
    setupLimitOrdersQuery({ orders: [MOCK_LIMIT_OPEN_ORDER] });

    const { result } = renderMostRecentOrder();

    expect(result.current.mostRecentOrder).toStrictEqual({
      type: BridgeTabKey.Recurring,
      order: newerRecurringOrder,
    });
  });

  it('returns the limit order when creation timestamps match', () => {
    setupRecurringOrderQuery({
      order: {
        ...MOCK_RECURRING_OPEN_ORDER,
        createdAt: MOCK_LIMIT_OPEN_ORDER.timingData.createdAt,
      },
    });
    setupLimitOrdersQuery({ orders: [MOCK_LIMIT_OPEN_ORDER] });

    const { result } = renderMostRecentOrder();

    expect(result.current.mostRecentOrder?.type).toBe(BridgeTabKey.Limit);
  });

  it('returns no order until both lookups settle', () => {
    setupRecurringOrderQuery({ order: MOCK_RECURRING_OPEN_ORDER });
    setupLimitOrdersQuery({ isLoading: true });

    const { result } = renderMostRecentOrder();

    expect(result.current.mostRecentOrder).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
  });

  it('returns the successful order when the other lookup fails', () => {
    setupRecurringOrderQuery({ order: MOCK_RECURRING_OPEN_ORDER });
    setupLimitOrdersQuery({
      orders: [MOCK_LIMIT_OPEN_ORDER],
      isError: true,
    });

    const { result } = renderMostRecentOrder();

    expect(result.current.mostRecentOrder).toStrictEqual({
      type: BridgeTabKey.Recurring,
      order: MOCK_RECURRING_OPEN_ORDER,
    });
    expect(result.current.isError).toBe(true);
  });

  it('returns no order when both lookups are empty', () => {
    const { result } = renderMostRecentOrder();

    expect(result.current.mostRecentOrder).toBeUndefined();
  });
});
