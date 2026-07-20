import { act } from '@testing-library/react-hooks';
import { type TransactionMeta } from '@metamask/transaction-controller';
import { type RampsOrder, RampsOrderStatus } from '@metamask/ramps-controller';

import Engine from '../../../../core/Engine';
import {
  renderHookWithProvider,
  type ProviderValues,
} from '../../../../util/test/renderWithProvider';
import { useFiatPaymentMethodName } from './useFiatPaymentMethodName';

jest.mock('../../../../core/Engine', () => ({
  context: {
    RampsController: {
      getOrder: jest.fn(),
    },
  },
}));

const getOrderMock = jest.mocked(Engine.context.RampsController.getOrder);

const WALLET = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B';

function makeTx(fiat?: {
  orderId?: string;
  provider?: string;
}): TransactionMeta {
  return {
    id: 'tx-1',
    txParams: { from: WALLET },
    metamaskPay: fiat ? { fiat } : undefined,
  } as unknown as TransactionMeta;
}

function makeOrder(overrides: Partial<RampsOrder> = {}): RampsOrder {
  return {
    isOnlyLink: false,
    success: true,
    cryptoAmount: '1',
    fiatAmount: 1,
    providerOrderId: 'o-1',
    providerOrderLink: 'https://example.com/o-1',
    createdAt: 0,
    totalFeesFiat: 0,
    txHash: '0xabc',
    walletAddress: WALLET,
    status: RampsOrderStatus.Completed,
    network: { name: 'Ethereum', chainId: 'eip155:1' },
    canBeUpdated: false,
    idHasExpired: false,
    excludeFromPurchases: false,
    timeDescriptionPending: '5-10 minutes',
    orderType: 'BUY',
    ...overrides,
  } as RampsOrder;
}

function makeState(orders: RampsOrder[] = []): ProviderValues['state'] {
  return {
    engine: {
      backgroundState: {
        RampsController: { orders },
      },
    },
  } as unknown as ProviderValues['state'];
}

function flushPromises() {
  return act(async () => {
    await Promise.resolve();
  });
}

describe('useFiatPaymentMethodName', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('does not fetch when the order id is missing', () => {
    renderHookWithProvider(
      () => useFiatPaymentMethodName(makeTx({ provider: 'transak' })),
      { state: makeState() },
    );
    expect(getOrderMock).not.toHaveBeenCalled();
  });

  it('does not fetch when the wallet address is missing', () => {
    const tx = {
      id: 'tx-1',
      txParams: {},
      metamaskPay: { fiat: { orderId: 'o-1', provider: 'transak' } },
    } as unknown as TransactionMeta;
    renderHookWithProvider(() => useFiatPaymentMethodName(tx), {
      state: makeState(),
    });
    expect(getOrderMock).not.toHaveBeenCalled();
  });

  it('does not fetch for a non-fiat deposit', () => {
    renderHookWithProvider(() => useFiatPaymentMethodName(makeTx()), {
      state: makeState(),
    });
    expect(getOrderMock).not.toHaveBeenCalled();
  });

  it('returns the cached payment-method name without fetching', () => {
    const orders = [
      makeOrder({
        providerOrderId: 'o-1',
        paymentMethod: { id: 'pm', name: 'Apple Pay' },
      }),
    ];

    const { result } = renderHookWithProvider(
      () =>
        useFiatPaymentMethodName(
          makeTx({ orderId: 'o-1', provider: 'transak' }),
        ),
      { state: makeState(orders) },
    );

    expect(result.current).toBe('Apple Pay');
    expect(getOrderMock).not.toHaveBeenCalled();
  });

  it('matches the cached order by providerOrderId, ignoring others', () => {
    const orders = [
      makeOrder({
        providerOrderId: 'other',
        paymentMethod: { id: 'pm', name: 'Debit Card' },
      }),
      makeOrder({
        providerOrderId: 'o-1',
        paymentMethod: { id: 'pm', name: 'Apple Pay' },
      }),
    ];

    const { result } = renderHookWithProvider(
      () =>
        useFiatPaymentMethodName(
          makeTx({ orderId: 'o-1', provider: 'transak' }),
        ),
      { state: makeState(orders) },
    );

    expect(result.current).toBe('Apple Pay');
    expect(getOrderMock).not.toHaveBeenCalled();
  });

  it('fetches with (provider, orderId, wallet) on a cache miss', async () => {
    getOrderMock.mockResolvedValue(
      makeOrder() as Awaited<ReturnType<typeof getOrderMock>>,
    );

    renderHookWithProvider(
      () =>
        useFiatPaymentMethodName(
          makeTx({ orderId: 'o-1', provider: 'transak-native' }),
        ),
      { state: makeState() },
    );

    await flushPromises();

    expect(getOrderMock).toHaveBeenCalledWith('transak-native', 'o-1', WALLET);
  });

  it('returns undefined on a cache miss until the fetched order lands in state', async () => {
    // The fetch writes the order into controller state; this test store is
    // static, so the selector keeps returning undefined.
    getOrderMock.mockResolvedValue(
      makeOrder({
        paymentMethod: { id: 'pm', name: 'Apple Pay' },
      }) as Awaited<ReturnType<typeof getOrderMock>>,
    );

    const { result } = renderHookWithProvider(
      () =>
        useFiatPaymentMethodName(
          makeTx({ orderId: 'o-1', provider: 'transak' }),
        ),
      { state: makeState() },
    );

    await flushPromises();

    expect(result.current).toBeUndefined();
  });

  it('still fetches when a cached order has no payment method', () => {
    getOrderMock.mockResolvedValue(
      makeOrder() as Awaited<ReturnType<typeof getOrderMock>>,
    );
    const orders = [
      makeOrder({ providerOrderId: 'o-1', paymentMethod: undefined }),
    ];

    const { result } = renderHookWithProvider(
      () =>
        useFiatPaymentMethodName(
          makeTx({ orderId: 'o-1', provider: 'transak' }),
        ),
      { state: makeState(orders) },
    );

    expect(result.current).toBeUndefined();
    expect(getOrderMock).toHaveBeenCalledWith('transak', 'o-1', WALLET);
  });

  it('swallows lookup failures and returns undefined', async () => {
    getOrderMock.mockRejectedValue(new Error('network'));

    const { result } = renderHookWithProvider(
      () =>
        useFiatPaymentMethodName(
          makeTx({ orderId: 'o-1', provider: 'transak' }),
        ),
      { state: makeState() },
    );

    await flushPromises();

    expect(result.current).toBeUndefined();
  });
});
