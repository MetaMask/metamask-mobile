import {
  RampsOrderStatus as Status,
  type RampsOrder,
} from '@metamask/ramps-controller';
import {
  handleOrderStatusChangedForNotifications,
  shouldShowOrderStatusToast,
} from './notification';
import { showV2OrderToast } from '../../../../../components/UI/Ramp/utils/v2OrderToast';

jest.mock('../../../../../components/UI/Ramp/utils/v2OrderToast', () => ({
  showV2OrderToast: jest.fn(),
}));

const createMockOrder = (overrides: Partial<RampsOrder> = {}): RampsOrder => ({
  isOnlyLink: false,
  success: true,
  cryptoAmount: '0.5',
  fiatAmount: 100,
  providerOrderId: 'order-1',
  providerOrderLink: 'https://example.com',
  createdAt: Date.now(),
  totalFeesFiat: 5,
  txHash: '0xabc',
  walletAddress: '0x123',
  status: Status.Completed,
  network: { name: 'Ethereum', chainId: 'eip155:1' },
  canBeUpdated: false,
  idHasExpired: false,
  excludeFromPurchases: false,
  timeDescriptionPending: '5-10 minutes',
  orderType: 'BUY',
  cryptoCurrency: { symbol: 'ETH' },
  ...overrides,
});

describe('shouldShowOrderStatusToast', () => {
  it('returns false when status is unchanged', () => {
    expect(shouldShowOrderStatusToast(Status.Completed, Status.Completed)).toBe(
      false,
    );
  });

  it('returns false for PRECREATED stub resolution transitions', () => {
    expect(
      shouldShowOrderStatusToast(Status.Precreated, Status.Completed),
    ).toBe(false);
    expect(shouldShowOrderStatusToast(Status.Precreated, Status.Pending)).toBe(
      false,
    );
  });

  it('returns true for active order status transitions', () => {
    expect(shouldShowOrderStatusToast(Status.Pending, Status.Completed)).toBe(
      true,
    );
    expect(shouldShowOrderStatusToast(Status.Created, Status.Pending)).toBe(
      true,
    );
  });
});

describe('handleOrderStatusChangedForNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls showV2OrderToast with correct params for Completed status', () => {
    handleOrderStatusChangedForNotifications({
      order: createMockOrder({ status: Status.Completed }),
      previousStatus: Status.Pending,
    });

    expect(showV2OrderToast).toHaveBeenCalledWith({
      orderId: 'order-1',
      cryptocurrency: 'ETH',
      cryptoAmount: '0.5',
      status: Status.Completed,
    });
  });

  it('does not call showV2OrderToast when status is unchanged', () => {
    handleOrderStatusChangedForNotifications({
      order: createMockOrder({ status: Status.Completed }),
      previousStatus: Status.Completed,
    });

    expect(showV2OrderToast).not.toHaveBeenCalled();
  });

  it('does not call showV2OrderToast for PRECREATED to Completed transition', () => {
    handleOrderStatusChangedForNotifications({
      order: createMockOrder({
        status: Status.Completed,
        cryptoCurrency: { symbol: 'BTC' },
      }),
      previousStatus: Status.Precreated,
    });

    expect(showV2OrderToast).not.toHaveBeenCalled();
  });

  it('calls showV2OrderToast for Failed status', () => {
    handleOrderStatusChangedForNotifications({
      order: createMockOrder({ status: Status.Failed }),
      previousStatus: Status.Pending,
    });

    expect(showV2OrderToast).toHaveBeenCalledWith(
      expect.objectContaining({ status: Status.Failed }),
    );
  });

  it('calls showV2OrderToast for Cancelled status', () => {
    handleOrderStatusChangedForNotifications({
      order: createMockOrder({ status: Status.Cancelled }),
      previousStatus: Status.Pending,
    });

    expect(showV2OrderToast).toHaveBeenCalledWith(
      expect.objectContaining({ status: Status.Cancelled }),
    );
  });

  it('calls showV2OrderToast for Pending status', () => {
    handleOrderStatusChangedForNotifications({
      order: createMockOrder({ status: Status.Pending }),
      previousStatus: Status.Created,
    });

    expect(showV2OrderToast).toHaveBeenCalledWith(
      expect.objectContaining({ status: Status.Pending }),
    );
  });

  it('delegates no-op statuses to showV2OrderToast when transition is eligible', () => {
    const statuses = [Status.Created, Status.Unknown, Status.IdExpired];

    for (const status of statuses) {
      jest.clearAllMocks();

      handleOrderStatusChangedForNotifications({
        order: createMockOrder({ status }),
        previousStatus: Status.Pending,
      });

      expect(showV2OrderToast).toHaveBeenCalledTimes(1);
    }
  });

  it('uses fallback "crypto" when cryptoCurrency is undefined', () => {
    handleOrderStatusChangedForNotifications({
      order: createMockOrder({
        status: Status.Completed,
        cryptoCurrency: undefined,
      }),
      previousStatus: Status.Pending,
    });

    expect(showV2OrderToast).toHaveBeenCalledWith(
      expect.objectContaining({ cryptocurrency: 'crypto' }),
    );
  });

  it('passes providerOrderId as orderId', () => {
    handleOrderStatusChangedForNotifications({
      order: createMockOrder({ providerOrderId: 'my-provider-order-123' }),
      previousStatus: Status.Pending,
    });

    expect(showV2OrderToast).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 'my-provider-order-123' }),
    );
  });
});
