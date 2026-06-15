import { renderHook, act } from '@testing-library/react-hooks';
import { type TransactionMeta } from '@metamask/transaction-controller';

import Engine from '../../../../core/Engine';
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

function flushPromises() {
  return act(async () => {
    await Promise.resolve();
  });
}

describe('useFiatPaymentMethodName', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('does not call getOrder when the order id is missing', () => {
    renderHook(() => useFiatPaymentMethodName(makeTx({ provider: 'transak' })));
    expect(getOrderMock).not.toHaveBeenCalled();
  });

  it('does not call getOrder when the provider is missing', () => {
    renderHook(() => useFiatPaymentMethodName(makeTx({ orderId: 'o-1' })));
    expect(getOrderMock).not.toHaveBeenCalled();
  });

  it('does not call getOrder when the wallet address is missing', () => {
    const tx = {
      id: 'tx-1',
      txParams: {},
      metamaskPay: { fiat: { orderId: 'o-1', provider: 'transak' } },
    } as unknown as TransactionMeta;
    renderHook(() => useFiatPaymentMethodName(tx));
    expect(getOrderMock).not.toHaveBeenCalled();
  });

  it('does not call getOrder for a non-fiat deposit', () => {
    renderHook(() => useFiatPaymentMethodName(makeTx()));
    expect(getOrderMock).not.toHaveBeenCalled();
  });

  it('returns undefined before the order resolves', () => {
    getOrderMock.mockReturnValue(new Promise(() => undefined));

    const { result } = renderHook(() =>
      useFiatPaymentMethodName(makeTx({ orderId: 'o-1', provider: 'transak' })),
    );

    expect(result.current).toBeUndefined();
  });

  it('fetches the order with (provider, orderId, wallet) and returns the payment-method name', async () => {
    getOrderMock.mockResolvedValue({
      paymentMethod: { id: 'pm', name: 'Apple Pay' },
    } as Awaited<ReturnType<typeof getOrderMock>>);

    const { result } = renderHook(() =>
      useFiatPaymentMethodName(
        makeTx({ orderId: 'o-1', provider: 'transak-native' }),
      ),
    );

    await flushPromises();

    expect(getOrderMock).toHaveBeenCalledWith('transak-native', 'o-1', WALLET);
    expect(result.current).toBe('Apple Pay');
  });

  it('returns undefined when the order has no payment method', async () => {
    getOrderMock.mockResolvedValue(
      {} as Awaited<ReturnType<typeof getOrderMock>>,
    );

    const { result } = renderHook(() =>
      useFiatPaymentMethodName(makeTx({ orderId: 'o-1', provider: 'transak' })),
    );

    await flushPromises();

    expect(result.current).toBeUndefined();
  });

  it('swallows lookup failures and returns undefined', async () => {
    getOrderMock.mockRejectedValue(new Error('network'));

    const { result } = renderHook(() =>
      useFiatPaymentMethodName(makeTx({ orderId: 'o-1', provider: 'transak' })),
    );

    await flushPromises();

    expect(result.current).toBeUndefined();
  });

  it('does not set state after unmount (no late update)', async () => {
    let resolveOrder!: (value: unknown) => void;
    getOrderMock.mockReturnValue(
      new Promise((resolve) => {
        resolveOrder = resolve;
      }) as ReturnType<typeof getOrderMock>,
    );

    const { result, unmount } = renderHook(() =>
      useFiatPaymentMethodName(makeTx({ orderId: 'o-1', provider: 'transak' })),
    );

    unmount();
    await act(async () => {
      resolveOrder({ paymentMethod: { id: 'pm', name: 'Apple Pay' } });
      await Promise.resolve();
    });

    // Unmounted before resolution: the cancelled guard prevents the update.
    expect(result.current).toBeUndefined();
  });
});
