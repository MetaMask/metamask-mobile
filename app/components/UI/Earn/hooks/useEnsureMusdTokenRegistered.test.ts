import { renderHook, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { retryWithExponentialDelay } from '../../../../util/exponential-retry';
import { ensureMusdTokenRegistered } from '../utils/musdConversionTransaction';
import { useEnsureMusdTokenRegistered } from './useEnsureMusdTokenRegistered';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      NetworkController: {
        findNetworkClientIdByChainId: jest.fn(),
      },
    },
  },
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

describe('useEnsureMusdTokenRegistered', () => {
  const mockUseSelector = jest.mocked(useSelector);
  const mockFindNetworkClientIdByChainId = jest.mocked(
    Engine.context.NetworkController.findNetworkClientIdByChainId,
  );
  const mockEnsureMusdTokenRegistered = jest.mocked(ensureMusdTokenRegistered);
  const mockRetryWithExponentialDelay = jest.mocked(retryWithExponentialDelay);
  const mockLoggerError = jest.mocked(Logger.error);

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
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
      mockUseSelector.mockReturnValue(['0x1', '0xe708']);
      mockFindNetworkClientIdByChainId
        .mockReturnValueOnce('mainnet')
        .mockReturnValueOnce('linea-mainnet');

      renderHook(() => useEnsureMusdTokenRegistered());

      await waitFor(() => {
        expect(mockEnsureMusdTokenRegistered).toHaveBeenCalledTimes(2);
      });

      expect(mockEnsureMusdTokenRegistered).toHaveBeenCalledWith({
        chainId: '0x1',
        networkClientId: 'mainnet',
      });
      expect(mockEnsureMusdTokenRegistered).toHaveBeenCalledWith({
        chainId: '0xe708',
        networkClientId: 'linea-mainnet',
      });
    });

    it('wraps each registration call with retryWithExponentialDelay using maxRetries 2', async () => {
      mockUseSelector.mockReturnValue(['0x1']);
      mockFindNetworkClientIdByChainId.mockReturnValue('mainnet');

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

  describe('skipping chains without a network client', () => {
    it('skips registration for a chain when findNetworkClientIdByChainId throws and continues to the next chain', async () => {
      const chainNotFoundError = new Error('Invalid chain ID "0xe708"');
      mockUseSelector.mockReturnValue(['0x1', '0xe708']);
      mockFindNetworkClientIdByChainId
        .mockReturnValueOnce('mainnet')
        .mockImplementationOnce(() => {
          throw chainNotFoundError;
        });

      renderHook(() => useEnsureMusdTokenRegistered());

      await waitFor(() => {
        expect(mockFindNetworkClientIdByChainId).toHaveBeenCalledTimes(2);
      });

      expect(mockEnsureMusdTokenRegistered).toHaveBeenCalledTimes(1);
      expect(mockEnsureMusdTokenRegistered).toHaveBeenCalledWith({
        chainId: '0x1',
        networkClientId: 'mainnet',
      });
      expect(mockLoggerError).toHaveBeenCalledWith(
        chainNotFoundError,
        '[mUSD] Failed to register mUSD token for chain 0xe708',
      );
    });

    it('logs an error for each chain when findNetworkClientIdByChainId throws for all chains', async () => {
      const chainNotFoundError = new Error('Invalid chain ID');
      mockUseSelector.mockReturnValue(['0x1', '0xe708']);
      mockFindNetworkClientIdByChainId.mockImplementation(() => {
        throw chainNotFoundError;
      });

      renderHook(() => useEnsureMusdTokenRegistered());

      await waitFor(() => {
        expect(mockLoggerError).toHaveBeenCalledTimes(2);
      });

      expect(mockEnsureMusdTokenRegistered).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('logs error via Logger.error when ensureMusdTokenRegistered fails after all retries', async () => {
      const registrationError = new Error('network error');
      mockUseSelector.mockReturnValue(['0x1']);
      mockFindNetworkClientIdByChainId.mockReturnValue('mainnet');
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
      mockUseSelector.mockReturnValue(['0x1', '0xe708']);
      mockFindNetworkClientIdByChainId
        .mockReturnValueOnce('mainnet')
        .mockReturnValueOnce('linea-mainnet');
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
        networkClientId: 'linea-mainnet',
      });
    });

    it('logs an unexpected error via Logger.error when registerMusdTokens rejects outside the per-chain catch', async () => {
      const unexpectedError = new Error('unexpected failure');
      mockUseSelector.mockReturnValue(['0x1']);
      mockFindNetworkClientIdByChainId.mockReturnValue('mainnet');
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
      mockUseSelector.mockReturnValue(['0x1']);
      mockFindNetworkClientIdByChainId.mockReturnValue('mainnet');

      const { rerender } = renderHook(() => useEnsureMusdTokenRegistered());

      await waitFor(() => {
        expect(mockEnsureMusdTokenRegistered).toHaveBeenCalledTimes(1);
      });

      mockUseSelector.mockReturnValue(['0x1', '0xe708']);
      mockFindNetworkClientIdByChainId
        .mockReturnValueOnce('mainnet')
        .mockReturnValueOnce('linea-mainnet');

      rerender({});

      await waitFor(() => {
        expect(mockEnsureMusdTokenRegistered).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('empty chain list', () => {
    it('does not call ensureMusdTokenRegistered when selector returns an empty array', async () => {
      mockUseSelector.mockReturnValue([]);

      renderHook(() => useEnsureMusdTokenRegistered());

      // Allow any async effects to flush
      await waitFor(() => {
        expect(mockFindNetworkClientIdByChainId).not.toHaveBeenCalled();
      });

      expect(mockEnsureMusdTokenRegistered).not.toHaveBeenCalled();
      expect(mockLoggerError).not.toHaveBeenCalled();
    });
  });
});
