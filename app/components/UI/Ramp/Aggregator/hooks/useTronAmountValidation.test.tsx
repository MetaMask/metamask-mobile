import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

import { useTronAmountValidation } from './useTronAmountValidation';

const mockValidateTronTransferAmount = jest.fn();

jest.mock('../../../../../core/Multichain/tron', () => ({
  ...jest.requireActual('../../../../../core/Multichain/tron'),
  validateTronTransferAmount: (...args: unknown[]) =>
    mockValidateTronTransferAmount(...args),
}));

const mockStore = configureMockStore();

const mockAccount = {
  id: 'tron-account-id',
  address: 'TXYZ1234567890abcdefghijklmnopqrst',
  metadata: { snap: { id: 'npm:@metamask/tron-wallet-snap' } },
};

const mockState = {
  engine: {
    backgroundState: {
      AccountsController: {
        internalAccounts: {
          accounts: {
            [mockAccount.id]: mockAccount,
          },
          selectedAccount: mockAccount.id,
        },
      },
      KeyringController: {
        keyrings: [],
      },
    },
  },
};

const createWrapper = (store: ReturnType<typeof mockStore>) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return Wrapper;
};

describe('useTronAmountValidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('does nothing when disabled', async () => {
    const store = mockStore(mockState);
    const { result } = renderHook(
      () =>
        useTronAmountValidation({
          enabled: false,
          amount: '10',
          assetChainId: 'tron:728126428',
          assetReference: 'slip44:195',
          walletAddress: mockAccount.address,
        }),
      { wrapper: createWrapper(store) },
    );

    jest.runAllTimers();

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
      expect(result.current.validationError).toBeUndefined();
    });

    expect(mockValidateTronTransferAmount).not.toHaveBeenCalled();
  });

  it('does nothing when amount is zero', async () => {
    const store = mockStore(mockState);
    const { result } = renderHook(
      () =>
        useTronAmountValidation({
          enabled: true,
          amount: '0',
          assetChainId: 'tron:728126428',
          assetReference: 'slip44:195',
          walletAddress: mockAccount.address,
        }),
      { wrapper: createWrapper(store) },
    );

    jest.runAllTimers();

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
      expect(result.current.validationError).toBeUndefined();
    });

    expect(mockValidateTronTransferAmount).not.toHaveBeenCalled();
  });

  it('validates after debounce period when amount changes', async () => {
    mockValidateTronTransferAmount.mockResolvedValue({
      valid: true,
      errors: [],
    });

    const store = mockStore(mockState);
    const { result } = renderHook(
      () =>
        useTronAmountValidation({
          enabled: true,
          amount: '10',
          assetChainId: 'tron:728126428',
          assetReference: 'slip44:195',
          walletAddress: mockAccount.address,
        }),
      { wrapper: createWrapper(store) },
    );

    jest.runAllTimers();

    await waitFor(() => {
      expect(mockValidateTronTransferAmount).toHaveBeenCalledWith(mockAccount, {
        accountId: mockAccount.id,
        assetId: 'tron:728126428/slip44:195',
        value: '10',
      });
    });

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
      expect(result.current.validationError).toBeUndefined();
    });
  });

  it('shows error when validation fails with InsufficientBalance', async () => {
    mockValidateTronTransferAmount.mockResolvedValue({
      valid: false,
      errors: [{ code: 'InsufficientBalance' }],
    });

    const store = mockStore(mockState);
    const { result } = renderHook(
      () =>
        useTronAmountValidation({
          enabled: true,
          amount: '100',
          assetChainId: 'tron:728126428',
          assetReference: 'slip44:195',
          walletAddress: mockAccount.address,
        }),
      { wrapper: createWrapper(store) },
    );

    jest.runAllTimers();

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
      expect(result.current.validationError).toBe('Insufficient funds');
    });
  });

  it('shows error when validation fails with InsufficientBalanceToCoverFee', async () => {
    mockValidateTronTransferAmount.mockResolvedValue({
      valid: false,
      errors: [{ code: 'InsufficientBalanceToCoverFee' }],
    });

    const store = mockStore(mockState);
    const { result } = renderHook(
      () =>
        useTronAmountValidation({
          enabled: true,
          amount: '100',
          assetChainId: 'tron:728126428',
          assetReference: 'slip44:195',
          walletAddress: mockAccount.address,
        }),
      { wrapper: createWrapper(store) },
    );

    jest.runAllTimers();

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
      expect(result.current.validationError).toBe(
        'This account needs more TRX or network resources to complete the transaction.',
      );
    });
  });

  it('shows generic error when Snap returns nothing', async () => {
    mockValidateTronTransferAmount.mockResolvedValue(undefined);

    const store = mockStore(mockState);
    const { result } = renderHook(
      () =>
        useTronAmountValidation({
          enabled: true,
          amount: '10',
          assetChainId: 'tron:728126428',
          assetReference: 'slip44:195',
          walletAddress: mockAccount.address,
        }),
      { wrapper: createWrapper(store) },
    );

    jest.runAllTimers();

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
      expect(result.current.validationError).toBe(
        'Unable to verify this amount. Please try again.',
      );
    });
  });

  it('shows generic error when Snap throws', async () => {
    mockValidateTronTransferAmount.mockRejectedValue(new Error('Snap error'));

    const store = mockStore(mockState);
    const { result } = renderHook(
      () =>
        useTronAmountValidation({
          enabled: true,
          amount: '10',
          assetChainId: 'tron:728126428',
          assetReference: 'slip44:195',
          walletAddress: mockAccount.address,
        }),
      { wrapper: createWrapper(store) },
    );

    jest.runAllTimers();

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
      expect(result.current.validationError).toBe(
        'Unable to verify this amount. Please try again.',
      );
    });
  });

  it('cancels previous validation when amount changes', async () => {
    mockValidateTronTransferAmount.mockResolvedValue({
      valid: true,
      errors: [],
    });

    const store = mockStore(mockState);
    const { result, rerender } = renderHook(
      ({ amount }: { amount: string }) =>
        useTronAmountValidation({
          enabled: true,
          amount,
          assetChainId: 'tron:728126428',
          assetReference: 'slip44:195',
          walletAddress: mockAccount.address,
        }),
      { wrapper: createWrapper(store), initialProps: { amount: '10' } },
    );

    jest.advanceTimersByTime(100);

    rerender({ amount: '20' });

    jest.runAllTimers();

    await waitFor(() => {
      expect(mockValidateTronTransferAmount).toHaveBeenCalledTimes(1);
      expect(mockValidateTronTransferAmount).toHaveBeenCalledWith(mockAccount, {
        accountId: mockAccount.id,
        assetId: 'tron:728126428/slip44:195',
        value: '20',
      });
    });

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    });
  });

  it('clears error when amount becomes zero', async () => {
    mockValidateTronTransferAmount.mockResolvedValue({
      valid: false,
      errors: [{ code: 'InsufficientBalance' }],
    });

    const store = mockStore(mockState);
    const { result, rerender } = renderHook(
      ({ amount }: { amount: string }) =>
        useTronAmountValidation({
          enabled: true,
          amount,
          assetChainId: 'tron:728126428',
          assetReference: 'slip44:195',
          walletAddress: mockAccount.address,
        }),
      { wrapper: createWrapper(store), initialProps: { amount: '100' } },
    );

    jest.runAllTimers();

    await waitFor(() => {
      expect(result.current.validationError).toBe('Insufficient funds');
    });

    rerender({ amount: '0' });

    await waitFor(() => {
      expect(result.current.validationError).toBeUndefined();
      expect(result.current.isValidating).toBe(false);
    });
  });

  it('clears error when disabled', async () => {
    mockValidateTronTransferAmount.mockResolvedValue({
      valid: false,
      errors: [{ code: 'InsufficientBalance' }],
    });

    const store = mockStore(mockState);
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useTronAmountValidation({
          enabled,
          amount: '100',
          assetChainId: 'tron:728126428',
          assetReference: 'slip44:195',
          walletAddress: mockAccount.address,
        }),
      { wrapper: createWrapper(store), initialProps: { enabled: true } },
    );

    jest.runAllTimers();

    await waitFor(() => {
      expect(result.current.validationError).toBe('Insufficient funds');
    });

    rerender({ enabled: false });

    await waitFor(() => {
      expect(result.current.validationError).toBeUndefined();
      expect(result.current.isValidating).toBe(false);
    });
  });

  it('shows generic error for unknown error code', async () => {
    mockValidateTronTransferAmount.mockResolvedValue({
      valid: false,
      errors: [{ code: 'UnknownError' }],
    });

    const store = mockStore(mockState);
    const { result } = renderHook(
      () =>
        useTronAmountValidation({
          enabled: true,
          amount: '10',
          assetChainId: 'tron:728126428',
          assetReference: 'slip44:195',
          walletAddress: mockAccount.address,
        }),
      { wrapper: createWrapper(store) },
    );

    jest.runAllTimers();

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
      expect(result.current.validationError).toBe('Invalid value');
    });
  });

  it('handles missing wallet address gracefully', async () => {
    const store = mockStore(mockState);
    const { result } = renderHook(
      () =>
        useTronAmountValidation({
          enabled: true,
          amount: '10',
          assetChainId: 'tron:728126428',
          assetReference: 'slip44:195',
          walletAddress: undefined,
        }),
      { wrapper: createWrapper(store) },
    );

    jest.runAllTimers();

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
      expect(result.current.validationError).toBeUndefined();
    });

    expect(mockValidateTronTransferAmount).not.toHaveBeenCalled();
  });

  it('handles missing asset chain ID gracefully', async () => {
    const store = mockStore(mockState);
    const { result } = renderHook(
      () =>
        useTronAmountValidation({
          enabled: true,
          amount: '10',
          assetChainId: undefined,
          assetReference: 'slip44:195',
          walletAddress: mockAccount.address,
        }),
      { wrapper: createWrapper(store) },
    );

    jest.runAllTimers();

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
      expect(result.current.validationError).toBeUndefined();
    });

    expect(mockValidateTronTransferAmount).not.toHaveBeenCalled();
  });

  it('handles missing asset reference gracefully', async () => {
    const store = mockStore(mockState);
    const { result } = renderHook(
      () =>
        useTronAmountValidation({
          enabled: true,
          amount: '10',
          assetChainId: 'tron:728126428',
          assetReference: undefined,
          walletAddress: mockAccount.address,
        }),
      { wrapper: createWrapper(store) },
    );

    jest.runAllTimers();

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
      expect(result.current.validationError).toBeUndefined();
    });

    expect(mockValidateTronTransferAmount).not.toHaveBeenCalled();
  });

  it('ignores stale validation results when amount changes during request', async () => {
    let firstRequestResolve!: (value: unknown) => void;
    const firstRequestPromise = new Promise((resolve) => {
      firstRequestResolve = resolve;
    });

    mockValidateTronTransferAmount.mockImplementationOnce(
      () => firstRequestPromise,
    );
    mockValidateTronTransferAmount.mockResolvedValueOnce({
      valid: true,
      errors: [],
    });

    const store = mockStore(mockState);
    const { result, rerender } = renderHook(
      ({ amount }: { amount: string }) =>
        useTronAmountValidation({
          enabled: true,
          amount,
          assetChainId: 'tron:728126428',
          assetReference: 'slip44:195',
          walletAddress: mockAccount.address,
        }),
      { wrapper: createWrapper(store), initialProps: { amount: '10' } },
    );

    // Start first validation
    jest.runAllTimers();

    await waitFor(() => {
      expect(result.current.isValidating).toBe(true);
    });

    // Change amount while first request is in flight
    rerender({ amount: '20' });

    // Resolve the stale first request with an error
    firstRequestResolve({
      valid: false,
      errors: [{ code: 'InsufficientBalance' }],
    });

    // Start second validation
    jest.runAllTimers();

    // The stale result should be ignored
    await waitFor(() => {
      expect(result.current.validationError).toBeUndefined();
    });

    // Second validation completes successfully
    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
      expect(result.current.validationError).toBeUndefined();
    });
  });

  it('ignores stale validation results when disabled during request', async () => {
    let requestResolve!: (value: unknown) => void;
    const requestPromise = new Promise((resolve) => {
      requestResolve = resolve;
    });

    mockValidateTronTransferAmount.mockImplementationOnce(() => requestPromise);

    const store = mockStore(mockState);
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useTronAmountValidation({
          enabled,
          amount: '10',
          assetChainId: 'tron:728126428',
          assetReference: 'slip44:195',
          walletAddress: mockAccount.address,
        }),
      { wrapper: createWrapper(store), initialProps: { enabled: true } },
    );

    // Start validation
    jest.runAllTimers();

    await waitFor(() => {
      expect(result.current.isValidating).toBe(true);
    });

    // Disable while request is in flight
    rerender({ enabled: false });

    // Resolve the stale request with an error
    requestResolve({
      valid: false,
      errors: [{ code: 'InsufficientBalance' }],
    });

    // The stale result should be ignored
    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
      expect(result.current.validationError).toBeUndefined();
    });
  });

  it('sets isDebouncing true during debounce period', () => {
    const store = mockStore(mockState);
    const { result } = renderHook(
      () =>
        useTronAmountValidation({
          enabled: true,
          amount: '10',
          assetChainId: 'tron:728126428',
          assetReference: 'slip44:195',
          walletAddress: mockAccount.address,
        }),
      { wrapper: createWrapper(store) },
    );

    // Should be debouncing immediately
    expect(result.current.isDebouncing).toBe(true);
    expect(result.current.isValidating).toBe(false);
  });

  it('resets isValidating when validate returns early due to missing data', async () => {
    let requestResolve!: (value: unknown) => void;
    const requestPromise = new Promise((resolve) => {
      requestResolve = resolve;
    });

    mockValidateTronTransferAmount.mockImplementationOnce(() => requestPromise);

    const store = mockStore(mockState);
    const { result, rerender } = renderHook(
      ({ walletAddress }: { walletAddress: string | undefined }) =>
        useTronAmountValidation({
          enabled: true,
          amount: '10',
          assetChainId: 'tron:728126428',
          assetReference: 'slip44:195',
          walletAddress,
        }),
      {
        wrapper: createWrapper(store),
        initialProps: { walletAddress: mockAccount.address },
      },
    );

    // Start validation
    jest.runAllTimers();

    await waitFor(() => {
      expect(result.current.isValidating).toBe(true);
    });

    // Remove wallet address while request is in flight
    rerender({ walletAddress: '' });

    // isValidating should be reset to false immediately due to early return
    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    });

    // Resolve the stale request
    requestResolve({
      valid: true,
      errors: [],
    });
  });
});
