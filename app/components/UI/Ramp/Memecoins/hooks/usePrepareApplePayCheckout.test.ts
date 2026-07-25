import { renderHook, waitFor, act } from '@testing-library/react-native';
import { usePrepareApplePayCheckout } from './usePrepareApplePayCheckout';

jest.mock('../crossmint/api', () => ({
  createCrossmintOrder: jest.fn(),
}));

jest.mock('../crossmint/buildCheckoutUrl', () => ({
  buildCrossmintCheckoutUrl: jest.fn(
    ({ orderId, clientSecret }: { orderId: string; clientSecret: string }) =>
      `https://checkout.test/?orderId=${orderId}&clientSecret=${clientSecret}`,
  ),
}));

const { createCrossmintOrder } = jest.requireMock('../crossmint/api') as {
  createCrossmintOrder: jest.Mock;
};

describe('usePrepareApplePayCheckout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    createCrossmintOrder.mockResolvedValue({
      order: { orderId: 'order-1' },
      clientSecret: 'secret-1',
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates a checkout URL after debounce when amount and wallet are valid', async () => {
    const { result } = renderHook(() =>
      usePrepareApplePayCheckout({
        tokenLocator: 'solana:token',
        amount: '100',
        walletAddress: 'wallet-1',
      }),
    );

    expect(result.current.isPreparing).toBe(true);

    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.prepared?.checkoutUrl).toContain('order-1');
      expect(result.current.prepared?.clientSecret).toBe('secret-1');
      expect(result.current.isPreparing).toBe(false);
    });

    expect(createCrossmintOrder).toHaveBeenCalledWith({
      tokenLocator: 'solana:token',
      amountUsd: '100',
      walletAddress: 'wallet-1',
    });
  });

  it('does not prepare when wallet is missing', async () => {
    const { result } = renderHook(() =>
      usePrepareApplePayCheckout({
        tokenLocator: 'solana:token',
        amount: '100',
        walletAddress: null,
      }),
    );

    await act(async () => {
      jest.advanceTimersByTime(400);
    });

    expect(result.current.prepared).toBeNull();
    expect(result.current.isPreparing).toBe(false);
    expect(createCrossmintOrder).not.toHaveBeenCalled();
  });
});
