import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useOptin } from './useOptIn';
import Engine from '../../../../core/Engine';
import { handleRewardsErrorMessage } from '../utils';
import { InternalAccount } from '@metamask/keyring-internal-api';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

jest.mock('../utils', () => ({
  handleRewardsErrorMessage: jest.fn(),
}));

describe('useOptIn', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockEngineCall = Engine.controllerMessenger.call as jest.MockedFunction<
    typeof Engine.controllerMessenger.call
  >;
  const mockHandleRewardsErrorMessage =
    handleRewardsErrorMessage as jest.MockedFunction<
      typeof handleRewardsErrorMessage
    >;

  const mockAccount: InternalAccount = {
    id: 'account-1',
    address: '0x123456789abcdef',
    metadata: {
      name: 'Test Account',
      importTime: Date.now(),
      keyring: {
        type: 'HD Key Tree',
      },
    },
    options: {},
    methods: ['personal_sign', 'eth_signTransaction'],
    type: 'eip155:eoa',
    scopes: ['eip155:1'],
  } as InternalAccount;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(mockAccount);
  });

  describe('initial state', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => useOptin());

      expect(result.current.optinLoading).toBe(false);
      expect(result.current.optinError).toBeNull();
      expect(typeof result.current.optin).toBe('function');
      expect(typeof result.current.clearOptinError).toBe('function');
    });
  });

  describe('successful opt-in', () => {
    it('should handle successful opt-in with referral code', async () => {
      // Arrange
      mockEngineCall.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useOptin());

      // Act
      await act(async () => {
        await result.current.optin({ referralCode: 'TEST123' });
      });

      // Assert
      expect(result.current.optinLoading).toBe(false);
      expect(result.current.optinError).toBeNull();

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:optIn',
        mockAccount,
        'TEST123',
      );
    });

    it('should handle successful opt-in without referral code', async () => {
      // Arrange
      mockEngineCall.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useOptin());

      // Act
      await act(async () => {
        await result.current.optin({});
      });

      // Assert
      expect(result.current.optinLoading).toBe(false);
      expect(result.current.optinError).toBeNull();

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:optIn',
        mockAccount,
        undefined,
      );
    });

    it('should handle successful opt-in with empty referral code', async () => {
      // Arrange
      mockEngineCall.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useOptin());

      // Act
      await act(async () => {
        await result.current.optin({ referralCode: '' });
      });

      // Assert
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:optIn',
        mockAccount,
        undefined,
      );
    });
  });

  describe('error handling', () => {
    it('should handle API errors and show handled error message', async () => {
      // Arrange
      const mockError = new Error('Account already registered');
      const handledErrorMessage = 'This account is already registered';
      mockEngineCall.mockRejectedValueOnce(mockError);
      mockHandleRewardsErrorMessage.mockReturnValueOnce(handledErrorMessage);

      const { result } = renderHook(() => useOptin());

      // Act
      await act(async () => {
        await result.current.optin({ referralCode: 'TEST123' });
      });

      // Assert
      expect(result.current.optinLoading).toBe(false);
      expect(result.current.optinError).toBe(handledErrorMessage);

      expect(mockHandleRewardsErrorMessage).toHaveBeenCalledWith(mockError);
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:optIn',
        mockAccount,
        'TEST123',
      );
    });

    it('should handle different error types through error handler', async () => {
      // Arrange
      const mockError = { data: { message: 'Network request failed' } };
      const handledErrorMessage = 'Service is not available at the moment';
      mockEngineCall.mockRejectedValueOnce(mockError);
      mockHandleRewardsErrorMessage.mockReturnValueOnce(handledErrorMessage);

      const { result } = renderHook(() => useOptin());

      // Act
      await act(async () => {
        await result.current.optin({});
      });

      // Assert
      expect(result.current.optinError).toBe(handledErrorMessage);
      expect(mockHandleRewardsErrorMessage).toHaveBeenCalledWith(mockError);
    });

    it('should clear previous error before new opt-in attempt', async () => {
      // Arrange - first call that fails
      const firstError = new Error('First error');
      const firstHandledError = 'First handled error';
      mockEngineCall.mockRejectedValueOnce(firstError);
      mockHandleRewardsErrorMessage.mockReturnValueOnce(firstHandledError);

      const { result } = renderHook(() => useOptin());

      // Act - first failed attempt
      await act(async () => {
        await result.current.optin({});
      });

      // Assert - should have error state
      expect(result.current.optinError).toBe(firstHandledError);

      // Arrange - second call that succeeds
      mockEngineCall.mockResolvedValueOnce(undefined);

      // Act - second successful attempt
      await act(async () => {
        await result.current.optin({ referralCode: 'TEST' });
      });

      // Assert - error should be cleared
      expect(result.current.optinError).toBeNull();
    });
  });

  describe('loading state management', () => {
    it('should set loading to true during API call and false after success', async () => {
      // Arrange
      let resolveApiCall: (value: undefined) => void;
      const apiCallPromise = new Promise<undefined>((resolve) => {
        resolveApiCall = resolve;
      });
      mockEngineCall.mockReturnValueOnce(apiCallPromise);

      const { result } = renderHook(() => useOptin());

      // Act - start opt-in
      const optinPromise = act(async () => {
        await result.current.optin({});
      });

      // Assert - loading should be true
      expect(result.current.optinLoading).toBe(true);
      expect(result.current.optinError).toBeNull();

      // Act - resolve API call
      act(() => {
        resolveApiCall(undefined);
      });

      // Wait for the promise to resolve
      await optinPromise;

      // Assert - loading should be false
      expect(result.current.optinLoading).toBe(false);
    });

    it('should set loading to true during API call and false after error', async () => {
      // Arrange
      let rejectApiCall: (error: Error) => void;
      const apiCallPromise = new Promise<undefined>((_, reject) => {
        rejectApiCall = reject;
      });
      mockEngineCall.mockReturnValueOnce(apiCallPromise);
      mockHandleRewardsErrorMessage.mockReturnValueOnce('Test error');

      const { result } = renderHook(() => useOptin());

      // Act - start opt-in
      const optinPromise = act(async () => {
        await result.current.optin({});
      });

      // Assert - loading should be true
      expect(result.current.optinLoading).toBe(true);

      // Act - reject API call
      act(() => {
        rejectApiCall(new Error('Test error'));
      });

      // Wait for the promise to resolve
      await optinPromise;

      // Assert - loading should be false
      expect(result.current.optinLoading).toBe(false);
      expect(result.current.optinError).toBe('Test error');
    });
  });

  describe('clearOptinError functionality', () => {
    it('should clear error when clearOptinError is called', async () => {
      // Arrange - create error state
      const mockError = new Error('Test error');
      mockEngineCall.mockRejectedValueOnce(mockError);
      mockHandleRewardsErrorMessage.mockReturnValueOnce('Test error message');

      const { result } = renderHook(() => useOptin());

      // Act - create error state
      await act(async () => {
        await result.current.optin({});
      });

      // Assert - should have error
      expect(result.current.optinError).toBe('Test error message');

      // Act - clear error
      act(() => {
        result.current.clearOptinError();
      });

      // Assert - error should be cleared
      expect(result.current.optinError).toBeNull();
    });

    it('should handle multiple calls to clearOptinError gracefully', () => {
      const { result } = renderHook(() => useOptin());

      // Act - call clearOptinError multiple times
      act(() => {
        result.current.clearOptinError();
        result.current.clearOptinError();
        result.current.clearOptinError();
      });

      // Assert - should remain null
      expect(result.current.optinError).toBeNull();
    });
  });

  describe('account dependency handling', () => {
    it('should not call API when account is null', async () => {
      // Arrange
      mockUseSelector.mockReturnValue(null);

      const { result } = renderHook(() => useOptin());

      // Act
      await act(async () => {
        await result.current.optin({ referralCode: 'TEST' });
      });

      // Assert
      expect(mockEngineCall).not.toHaveBeenCalled();
      expect(result.current.optinLoading).toBe(false);
      expect(result.current.optinError).toBeNull();
    });

    it('should not call API when account is undefined', async () => {
      // Arrange
      mockUseSelector.mockReturnValue(undefined);

      const { result } = renderHook(() => useOptin());

      // Act
      await act(async () => {
        await result.current.optin({});
      });

      // Assert
      expect(mockEngineCall).not.toHaveBeenCalled();
    });

    it('should update function when account changes', () => {
      const { result, rerender } = renderHook(() => useOptin());

      const firstOptinFunction = result.current.optin;

      // Change account
      const newAccount = {
        ...mockAccount,
        id: 'account-2',
        address: '0xabcdef123456789',
      };
      mockUseSelector.mockReturnValue(newAccount);

      rerender();

      const secondOptinFunction = result.current.optin;

      expect(firstOptinFunction).not.toBe(secondOptinFunction);
    });

    it('should maintain stable function reference when account is unchanged', () => {
      const { result, rerender } = renderHook(() => useOptin());

      const firstOptinFunction = result.current.optin;

      // Rerender without changing account
      rerender();

      const secondOptinFunction = result.current.optin;

      expect(firstOptinFunction).toBe(secondOptinFunction);
    });
  });

  describe('clearOptinError callback stability', () => {
    it('should maintain stable clearOptinError reference across renders', () => {
      const { result, rerender } = renderHook(() => useOptin());

      const firstClearFunction = result.current.clearOptinError;

      rerender();

      const secondClearFunction = result.current.clearOptinError;

      expect(firstClearFunction).toBe(secondClearFunction);
    });
  });

  describe('referral code handling', () => {
    it('should handle undefined referral code', async () => {
      // Arrange
      mockEngineCall.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useOptin());

      // Act
      await act(async () => {
        await result.current.optin({ referralCode: undefined });
      });

      // Assert
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:optIn',
        mockAccount,
        undefined,
      );
    });

    it('should handle referral code with special characters', async () => {
      // Arrange
      mockEngineCall.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useOptin());

      // Act
      await act(async () => {
        await result.current.optin({ referralCode: 'REF-123_ABC!@#' });
      });

      // Assert
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:optIn',
        mockAccount,
        'REF-123_ABC!@#',
      );
    });
  });

  describe('edge cases', () => {
    it('should handle multiple simultaneous opt-in calls correctly', async () => {
      // Arrange
      let resolveFirst: (value: undefined) => void;
      let resolveSecond: (value: undefined) => void;

      const firstPromise = new Promise<undefined>((resolve) => {
        resolveFirst = resolve;
      });
      const secondPromise = new Promise<undefined>((resolve) => {
        resolveSecond = resolve;
      });

      mockEngineCall
        .mockReturnValueOnce(firstPromise)
        .mockReturnValueOnce(secondPromise);

      const { result } = renderHook(() => useOptin());

      // Act - start both calls
      const firstCallPromise = act(async () => {
        await result.current.optin({ referralCode: 'FIRST' });
      });

      const secondCallPromise = act(async () => {
        await result.current.optin({ referralCode: 'SECOND' });
      });

      // Assert - should be loading
      expect(result.current.optinLoading).toBe(true);

      // Act - resolve both
      act(() => {
        resolveFirst(undefined);
        resolveSecond(undefined);
      });

      // Wait for both to complete
      await Promise.all([firstCallPromise, secondCallPromise]);

      // Assert
      expect(result.current.optinLoading).toBe(false);
      expect(result.current.optinError).toBeNull();
      expect(mockEngineCall).toHaveBeenCalledTimes(2);
    });

    it('should handle rapid opt-in and error clear calls', async () => {
      // Arrange
      const mockError = new Error('Test error');
      mockEngineCall.mockRejectedValueOnce(mockError);
      mockHandleRewardsErrorMessage.mockReturnValueOnce('Test error message');

      const { result } = renderHook(() => useOptin());

      // Act - opt-in and immediately clear error
      await act(async () => {
        await result.current.optin({});
      });

      act(() => {
        result.current.clearOptinError();
      });

      // Assert
      expect(result.current.optinError).toBeNull();
      expect(result.current.optinLoading).toBe(false);
    });
  });
});
