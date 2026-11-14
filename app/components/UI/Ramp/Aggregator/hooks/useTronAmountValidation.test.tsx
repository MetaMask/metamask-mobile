import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

import { useTronAmountValidation } from './useTronAmountValidation';
import * as tronModule from '../../../../../core/Multichain/tron';

jest.mock('../../../../../core/Multichain/tron', () => ({
  validateTronTransferAmount: jest.fn(),
}));

const mockValidateTronTransferAmount =
  tronModule.validateTronTransferAmount as jest.Mock;

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
      expect(mockValidateTronTransferAmount).toHaveBeenCalledWith(
        mockAccount,
        {
          accountId: mockAccount.id,
          assetId: 'tron:728126428/slip44:195',
          value: '10',
        },
      );
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
      expect(mockValidateTronTransferAmount).toHaveBeenCalledWith(
        mockAccount,
        {
          accountId: mockAccount.id,
          assetId: 'tron:728126428/slip44:195',
          value: '20',
        },
      );
    });

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    });
  });
});
