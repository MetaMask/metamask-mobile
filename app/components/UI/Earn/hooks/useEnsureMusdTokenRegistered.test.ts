import { renderHook, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import Logger from '../../../../util/Logger';
import { retryWithExponentialDelay } from '../../../../util/exponential-retry';
import { ensureMusdTokenRegistered } from '../utils/musdConversionTransaction';
import { selectMusdTokenRegistrationChainIds } from '../selectors/featureFlags';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../../selectors/multichainAccounts/accountTreeController';
import { useEnsureMusdTokenRegistered } from './useEnsureMusdTokenRegistered';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

jest.mock('../../../../util/exponential-retry', () => ({
  retryWithExponentialDelay: jest.fn((fn: () => Promise<unknown>) => fn()),
}));

jest.mock('../utils/musdConversionTransaction', () => ({
  ensureMusdTokenRegistered: jest.fn(),
}));

jest.mock('../selectors/featureFlags', () => ({
  selectMusdTokenRegistrationChainIds: jest.fn(),
}));

jest.mock(
  '../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectSelectedAccountGroupEvmInternalAccount: jest.fn(),
  }),
);

const ACCOUNT_ID = 'account-1';

describe('useEnsureMusdTokenRegistered', () => {
  const mockUseSelector = jest.mocked(useSelector);
  const mockEnsureMusdTokenRegistered = jest.mocked(ensureMusdTokenRegistered);
  const mockRetryWithExponentialDelay = jest.mocked(retryWithExponentialDelay);
  const mockLoggerError = jest.mocked(Logger.error);

  let chainIdsToRegister: string[];
  let selectedEvmAccount: { id: string } | undefined;

  const setupSelectors = () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectMusdTokenRegistrationChainIds) {
        return chainIdsToRegister;
      }
      if (selector === selectSelectedAccountGroupEvmInternalAccount) {
        return selectedEvmAccount;
      }
      return undefined;
    });
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    chainIdsToRegister = [];
    selectedEvmAccount = { id: ACCOUNT_ID };
    setupSelectors();
    mockRetryWithExponentialDelay.mockImplementation(
      (fn: () => Promise<unknown>) => fn(),
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('happy path — registration', () => {
    it('calls ensureMusdTokenRegistered for each chain ID returned by the selector', async () => {
      chainIdsToRegister = ['0x1', '0xe708'];
      setupSelectors();

      renderHook(() => useEnsureMusdTokenRegistered());

      await waitFor(() => {
        expect(mockEnsureMusdTokenRegistered).toHaveBeenCalledTimes(2);
      });

      expect(mockEnsureMusdTokenRegistered).toHaveBeenCalledWith({
        chainId: '0x1',
        accountId: ACCOUNT_ID,
      });
      expect(mockEnsureMusdTokenRegistered).toHaveBeenCalledWith({
        chainId: '0xe708',
        accountId: ACCOUNT_ID,
      });
    });

    it('wraps each registration call with retryWithExponentialDelay using maxRetries 2', async () => {
      chainIdsToRegister = ['0x1'];
      setupSelectors();

      renderHook(() => useEnsureMusdTokenRegistered());

      await waitFor(() => {
        expect(mockRetryWithExponentialDelay).toHaveBeenCalledTimes(1);
      });

      expect(mockRetryWithExponentialDelay).toHaveBeenCalledWith(
        expect.any(Function),
        2,
      );
    });
  });

  describe('no selected EVM account', () => {
    it('does not call ensureMusdTokenRegistered when there is no selected EVM account', async () => {
      chainIdsToRegister = ['0x1', '0xe708'];
      selectedEvmAccount = undefined;
      setupSelectors();

      renderHook(() => useEnsureMusdTokenRegistered());

      await waitFor(() => {
        expect(mockEnsureMusdTokenRegistered).not.toHaveBeenCalled();
      });
    });
  });

  describe('error handling', () => {
    it('logs error via Logger.error when ensureMusdTokenRegistered fails after all retries', async () => {
      const registrationError = new Error('network error');
      chainIdsToRegister = ['0x1'];
      setupSelectors();
      mockRetryWithExponentialDelay.mockRejectedValue(registrationError);

      renderHook(() => useEnsureMusdTokenRegistered());

      await waitFor(() => {
        expect(mockLoggerError).toHaveBeenCalledTimes(1);
      });

      expect(mockLoggerError).toHaveBeenCalledWith(
        registrationError,
        '[mUSD] Failed to register mUSD token for chain 0x1',
      );
    });

    it('continues registering remaining chains after one chain fails', async () => {
      const registrationError = new Error('network error');
      chainIdsToRegister = ['0x1', '0xe708'];
      setupSelectors();
      mockRetryWithExponentialDelay
        .mockRejectedValueOnce(registrationError)
        .mockImplementationOnce((fn: () => Promise<unknown>) => fn());

      renderHook(() => useEnsureMusdTokenRegistered());

      await waitFor(() => {
        expect(mockLoggerError).toHaveBeenCalledTimes(1);
      });

      expect(mockLoggerError).toHaveBeenCalledWith(
        registrationError,
        '[mUSD] Failed to register mUSD token for chain 0x1',
      );
      expect(mockEnsureMusdTokenRegistered).toHaveBeenCalledTimes(1);
      expect(mockEnsureMusdTokenRegistered).toHaveBeenCalledWith({
        chainId: '0xe708',
        accountId: ACCOUNT_ID,
      });
    });

    it('logs an unexpected error via Logger.error when registerMusdTokens rejects outside the per-chain catch', async () => {
      const unexpectedError = new Error('unexpected failure');
      chainIdsToRegister = ['0x1'];
      setupSelectors();
      mockEnsureMusdTokenRegistered.mockRejectedValue(unexpectedError);
      mockRetryWithExponentialDelay.mockRejectedValue(unexpectedError);

      renderHook(() => useEnsureMusdTokenRegistered());

      await waitFor(() => {
        expect(mockLoggerError).toHaveBeenCalledWith(
          unexpectedError,
          '[mUSD] Failed to register mUSD token for chain 0x1',
        );
      });
    });
  });

  describe('effect re-run on chain IDs change', () => {
    it('re-runs registration when chainIdsToRegister changes', async () => {
      chainIdsToRegister = ['0x1'];
      setupSelectors();

      const { rerender } = renderHook(() => useEnsureMusdTokenRegistered());

      await waitFor(() => {
        expect(mockEnsureMusdTokenRegistered).toHaveBeenCalledTimes(1);
      });

      chainIdsToRegister = ['0x1', '0xe708'];
      setupSelectors();

      rerender({});

      await waitFor(() => {
        expect(mockEnsureMusdTokenRegistered).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('empty chain list', () => {
    it('does not call ensureMusdTokenRegistered when selector returns an empty array', async () => {
      chainIdsToRegister = [];
      setupSelectors();

      renderHook(() => useEnsureMusdTokenRegistered());

      // Allow any async effects to flush
      await waitFor(() => {
        expect(mockEnsureMusdTokenRegistered).not.toHaveBeenCalled();
      });

      expect(mockLoggerError).not.toHaveBeenCalled();
    });
  });
});
