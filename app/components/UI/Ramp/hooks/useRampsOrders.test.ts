import { renderHook, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { AccountGroupType } from '@metamask/account-api';
import { RampsOrderStatus, type RampsOrder } from '@metamask/ramps-controller';
import type { MoneyAccount } from '@metamask/money-account-controller';
import { createMockInternalAccount } from '../../../../util/test/accountsControllerTestUtils';
import { useRampsOrders } from './useRampsOrders';

const RAMP_HOOKS_TEST_ENTROPY_ID = 'use-ramps-orders-test';
const RAMP_HOOKS_TEST_WALLET_ID =
  `entropy:${RAMP_HOOKS_TEST_ENTROPY_ID}` as const;
const RAMP_HOOKS_TEST_GROUP_ID = `${RAMP_HOOKS_TEST_WALLET_ID}/0` as const;
const RAMP_HOOKS_TEST_ACCOUNT_ID = 'account-rh-1';
/** Must be a valid EVM address (20 bytes) so `areAddressesEqual` treats it as EVM. */
const RAMP_HOOKS_TEST_ADDRESS = '0x2990079bcdee240329a520d2444386fc119da21a';
const RAMP_HOOKS_TEST_MONEY_ADDRESS =
  '0x0000000000000000000000000000000000000002';

const rampHooksTestInternalAccount = {
  ...createMockInternalAccount(RAMP_HOOKS_TEST_ADDRESS, 'Test'),
  id: RAMP_HOOKS_TEST_ACCOUNT_ID,
};

const mockAddOrder = jest.fn();
const mockAddPrecreatedOrder = jest.fn();
const mockRemoveOrder = jest.fn();
const mockGetOrder = jest.fn();
const mockGetOrderFromCallback = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  context: {
    RampsController: {
      addOrder: (...args: unknown[]) => mockAddOrder(...args),
      addPrecreatedOrder: (...args: unknown[]) =>
        mockAddPrecreatedOrder(...args),
      removeOrder: (...args: unknown[]) => mockRemoveOrder(...args),
      getOrder: (...args: unknown[]) => mockGetOrder(...args),
      getOrderFromCallback: (...args: unknown[]) =>
        mockGetOrderFromCallback(...args),
    },
  },
}));

const createMockOrder = (overrides: Partial<RampsOrder> = {}): RampsOrder => ({
  isOnlyLink: false,
  success: true,
  cryptoAmount: '0.5',
  fiatAmount: 100,
  providerOrderId: 'order-1',
  providerOrderLink: 'https://example.com/order/1',
  createdAt: Date.now(),
  totalFeesFiat: 5,
  txHash: '0xabc',
  walletAddress: RAMP_HOOKS_TEST_ADDRESS,
  status: RampsOrderStatus.Completed,
  network: { name: 'Ethereum', chainId: 'eip155:1' },
  canBeUpdated: false,
  idHasExpired: false,
  excludeFromPurchases: false,
  timeDescriptionPending: '5-10 minutes',
  orderType: 'BUY',
  ...overrides,
});

const createMoneyAccount = (
  overrides: Partial<MoneyAccount> = {},
): MoneyAccount => ({
  id: 'money-account-1',
  address: RAMP_HOOKS_TEST_MONEY_ADDRESS,
  type: 'eip155:eoa',
  scopes: [],
  methods: [],
  options: {
    entropy: {
      type: 'mnemonic',
      id: RAMP_HOOKS_TEST_ENTROPY_ID,
      derivationPath: "m/44'/60'/0'/0/0",
      groupIndex: 0,
    },
    exportable: false,
  },
  ...overrides,
});

const createMockStore = (
  orders: RampsOrder[] = [],
  moneyAccounts: Record<string, MoneyAccount> = {},
) =>
  configureStore({
    reducer: {
      engine: () => ({
        backgroundState: {
          RampsController: {
            orders,
          },
          AccountTreeController: {
            accountTree: {
              wallets: {
                [RAMP_HOOKS_TEST_WALLET_ID]: {
                  id: RAMP_HOOKS_TEST_WALLET_ID,
                  metadata: { name: 'Test wallet' },
                  groups: {
                    [RAMP_HOOKS_TEST_GROUP_ID]: {
                      id: RAMP_HOOKS_TEST_GROUP_ID,
                      type: AccountGroupType.MultichainAccount,
                      accounts: [RAMP_HOOKS_TEST_ACCOUNT_ID],
                      metadata: {
                        name: 'Test Group',
                        entropy: { groupIndex: 0 },
                      },
                    },
                  },
                },
              },
            },
            selectedAccountGroup: RAMP_HOOKS_TEST_GROUP_ID,
          },
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              enableMultichainAccounts: {
                enabled: true,
                featureVersion: '1',
                minimumVersion: '1.0.0',
              },
            },
          },
          AccountsController: {
            internalAccounts: {
              accounts: {
                [RAMP_HOOKS_TEST_ACCOUNT_ID]: rampHooksTestInternalAccount,
              },
              selectedAccount: RAMP_HOOKS_TEST_ACCOUNT_ID,
            },
          },
          KeyringController: {
            keyrings: [],
          },
          MoneyAccountController: {
            moneyAccounts,
          },
        },
      }),
    },
  });

const wrapper = (store: ReturnType<typeof createMockStore>) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(Provider, { store } as never, children);
  };

describe('useRampsOrders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty orders when none exist', () => {
    const store = createMockStore();
    const { result } = renderHook(() => useRampsOrders(), {
      wrapper: wrapper(store),
    });

    expect(result.current.orders).toEqual([]);
  });

  it('returns orders from the store when walletAddress matches the selected account group', () => {
    const order = createMockOrder();
    const store = createMockStore([order]);
    const { result } = renderHook(() => useRampsOrders(), {
      wrapper: wrapper(store),
    });

    expect(result.current.orders).toEqual([order]);
  });

  it('excludes orders whose walletAddress is not in the selected account group', () => {
    const foreignOrder = createMockOrder({
      providerOrderId: 'foreign-order',
      walletAddress: '0x0000000000000000000000000000000000000001',
    });
    const store = createMockStore([foreignOrder]);
    const { result } = renderHook(() => useRampsOrders(), {
      wrapper: wrapper(store),
    });

    expect(result.current.orders).toEqual([]);
  });

  it('finds an order by providerOrderId', () => {
    const order1 = createMockOrder({ providerOrderId: 'order-1' });
    const order2 = createMockOrder({ providerOrderId: 'order-2' });
    const store = createMockStore([order1, order2]);
    const { result } = renderHook(() => useRampsOrders(), {
      wrapper: wrapper(store),
    });

    expect(result.current.getOrderById('order-2')).toEqual(order2);
  });

  it('excludes Money-only orders from lookup by default', () => {
    const moneyAccount = createMoneyAccount();
    const moneyOrder = createMockOrder({
      providerOrderId: 'money-order',
      walletAddress: RAMP_HOOKS_TEST_MONEY_ADDRESS,
    });
    const store = createMockStore([moneyOrder], {
      [moneyAccount.id]: moneyAccount,
    });
    const { result } = renderHook(() => useRampsOrders(), {
      wrapper: wrapper(store),
    });

    expect(result.current.orders).toEqual([]);
    expect(result.current.getOrderById('money-order')).toBeUndefined();
  });

  it('finds selected group Money orders in lookup when opted in without widening returned orders', () => {
    const selectedGroupOrder = createMockOrder({
      providerOrderId: 'selected-group-order',
    });
    const moneyAccount = createMoneyAccount();
    const moneyOrder = createMockOrder({
      providerOrderId: 'money-order',
      walletAddress: RAMP_HOOKS_TEST_MONEY_ADDRESS,
    });
    const store = createMockStore([selectedGroupOrder, moneyOrder], {
      [moneyAccount.id]: moneyAccount,
    });
    const { result } = renderHook(
      () => useRampsOrders({ includeMoneyAccountOrdersInLookup: true }),
      {
        wrapper: wrapper(store),
      },
    );

    expect(result.current.orders).toEqual([selectedGroupOrder]);
    expect(result.current.getOrderById('money-order')).toEqual(moneyOrder);
  });

  it('returns undefined for non-existent order id', () => {
    const store = createMockStore([createMockOrder()]);
    const { result } = renderHook(() => useRampsOrders(), {
      wrapper: wrapper(store),
    });

    expect(result.current.getOrderById('non-existent')).toBeUndefined();
  });

  it('calls Engine.context.RampsController.addOrder', () => {
    const store = createMockStore();
    const { result } = renderHook(() => useRampsOrders(), {
      wrapper: wrapper(store),
    });
    const order = createMockOrder();

    act(() => {
      result.current.addOrder(order);
    });

    expect(mockAddOrder).toHaveBeenCalledWith(order);
  });

  it('calls Engine.context.RampsController.removeOrder', () => {
    const store = createMockStore();
    const { result } = renderHook(() => useRampsOrders(), {
      wrapper: wrapper(store),
    });

    act(() => {
      result.current.removeOrder('order-1');
    });

    expect(mockRemoveOrder).toHaveBeenCalledWith('order-1');
  });

  it('calls Engine.context.RampsController.getOrder for refreshOrder', async () => {
    const refreshedOrder = createMockOrder({
      status: RampsOrderStatus.Completed,
    });
    mockGetOrder.mockResolvedValue(refreshedOrder);

    const store = createMockStore();
    const { result } = renderHook(() => useRampsOrders(), {
      wrapper: wrapper(store),
    });

    let returnedOrder: RampsOrder | undefined;
    await act(async () => {
      returnedOrder = await result.current.refreshOrder(
        'transak',
        'order-code',
        '0x123',
      );
    });

    expect(mockGetOrder).toHaveBeenCalledWith('transak', 'order-code', '0x123');
    expect(returnedOrder).toEqual(refreshedOrder);
  });

  it('calls Engine.context.RampsController.getOrderFromCallback', async () => {
    const callbackOrder = createMockOrder({ providerOrderId: 'callback-1' });
    mockGetOrderFromCallback.mockResolvedValue(callbackOrder);

    const store = createMockStore();
    const { result } = renderHook(() => useRampsOrders(), {
      wrapper: wrapper(store),
    });

    let returnedOrder: RampsOrder | undefined;
    await act(async () => {
      returnedOrder = await result.current.getOrderFromCallback(
        'transak',
        'https://callback.url',
        '0x123',
      );
    });

    expect(mockGetOrderFromCallback).toHaveBeenCalledWith(
      'transak',
      'https://callback.url',
      '0x123',
    );
    expect(returnedOrder).toEqual(callbackOrder);
  });

  it('calls Engine.context.RampsController.addPrecreatedOrder', () => {
    const store = createMockStore();
    const { result } = renderHook(() => useRampsOrders(), {
      wrapper: wrapper(store),
    });

    act(() => {
      result.current.addPrecreatedOrder({
        orderId: '/providers/transak/orders/abc-123',
        providerCode: 'transak',
        walletAddress: '0xabc',
        chainId: '1',
      });
    });

    expect(mockAddPrecreatedOrder).toHaveBeenCalledWith({
      orderId: '/providers/transak/orders/abc-123',
      providerCode: 'transak',
      walletAddress: '0xabc',
      chainId: '1',
    });
  });

  it('exposes all expected functions', () => {
    const store = createMockStore();
    const { result } = renderHook(() => useRampsOrders(), {
      wrapper: wrapper(store),
    });

    expect(typeof result.current.getOrderById).toBe('function');
    expect(typeof result.current.addOrder).toBe('function');
    expect(typeof result.current.addPrecreatedOrder).toBe('function');
    expect(typeof result.current.removeOrder).toBe('function');
    expect(typeof result.current.refreshOrder).toBe('function');
    expect(typeof result.current.getOrderFromCallback).toBe('function');
  });
});
