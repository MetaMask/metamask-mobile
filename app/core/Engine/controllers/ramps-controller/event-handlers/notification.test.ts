import {
  RampsOrderStatus as Status,
  type RampsOrder,
} from '@metamask/ramps-controller';
import { handleOrderStatusChanged } from './notification';
import NotificationManager from '../../../../NotificationManager';

jest.mock('../../../../NotificationManager', () => ({
  showSimpleNotification: jest.fn(),
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

describe('handleOrderStatusChanged', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows notification for Completed status', () => {
    handleOrderStatusChanged({
      order: createMockOrder({ status: Status.Completed }),
      previousStatus: Status.Pending,
    });

    expect(NotificationManager.showSimpleNotification).toHaveBeenCalledWith(
      expect.objectContaining({ duration: 5000 }),
    );
    expect(NotificationManager.showSimpleNotification).toHaveBeenCalledTimes(1);
  });

  it('shows notification for Failed status', () => {
    handleOrderStatusChanged({
      order: createMockOrder({ status: Status.Failed }),
      previousStatus: Status.Pending,
    });

    expect(NotificationManager.showSimpleNotification).toHaveBeenCalledTimes(1);
  });

  it('shows notification for IdExpired status', () => {
    handleOrderStatusChanged({
      order: createMockOrder({ status: Status.IdExpired }),
      previousStatus: Status.Pending,
    });

    expect(NotificationManager.showSimpleNotification).toHaveBeenCalledTimes(1);
  });

  it('shows notification for Cancelled status', () => {
    handleOrderStatusChanged({
      order: createMockOrder({ status: Status.Cancelled }),
      previousStatus: Status.Pending,
    });

    expect(NotificationManager.showSimpleNotification).toHaveBeenCalledTimes(1);
  });

  it('does not show notification for non-terminal statuses', () => {
    const nonTerminalStatuses = [
      Status.Pending,
      Status.Created,
      Status.Precreated,
      Status.Unknown,
    ];

    for (const status of nonTerminalStatuses) {
      jest.clearAllMocks();

      handleOrderStatusChanged({
        order: createMockOrder({ status }),
        previousStatus: Status.Unknown,
      });

      expect(NotificationManager.showSimpleNotification).not.toHaveBeenCalled();
    }
  });

  it('includes crypto amount and symbol in completed notification', () => {
    handleOrderStatusChanged({
      order: createMockOrder({
        status: Status.Completed,
        cryptoAmount: '1.5',
        cryptoCurrency: { symbol: 'BTC' },
      }),
      previousStatus: Status.Pending,
    });

    const call = (NotificationManager.showSimpleNotification as jest.Mock).mock
      .calls[0][0];
    expect(call.title).toContain('1.5');
    expect(call.title).toContain('BTC');
  });

  it('uses fallback when cryptoCurrency is undefined', () => {
    handleOrderStatusChanged({
      order: createMockOrder({
        status: Status.Completed,
        cryptoCurrency: undefined,
      }),
      previousStatus: Status.Pending,
    });

    const call = (NotificationManager.showSimpleNotification as jest.Mock).mock
      .calls[0][0];
    expect(call.title).toContain('crypto');
  });

  it('notification payload matches snapshot for each terminal status', () => {
    const terminalStatuses = [
      Status.Completed,
      Status.Failed,
      Status.Cancelled,
    ];

    for (const status of terminalStatuses) {
      jest.clearAllMocks();

      handleOrderStatusChanged({
        order: createMockOrder({ status }),
        previousStatus: Status.Pending,
      });

      expect(
        (NotificationManager.showSimpleNotification as jest.Mock).mock
          .calls[0][0],
      ).toMatchSnapshot(`notification for ${status}`);
    }
  });
});
