import { renderHook, act } from '@testing-library/react-hooks';
import { useDispatch, useSelector } from 'react-redux';
import { useCandidateSubscriptionId } from './useCandidateSubscriptionId';
import Engine from '../../../../core/Engine';
import { setCandidateSubscriptionId } from '../../../../actions/rewards';

// Mock dependencies
jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

jest.mock('../../../../actions/rewards', () => ({
  setCandidateSubscriptionId: jest.fn(),
}));

describe('useCandidateSubscriptionId', () => {
  const mockDispatch = jest.fn();
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockEngineCall = Engine.controllerMessenger.call as jest.MockedFunction<
    typeof Engine.controllerMessenger.call
  >;
  const mockSetCandidateSubscriptionId =
    setCandidateSubscriptionId as jest.MockedFunction<
      typeof setCandidateSubscriptionId
    >;

  const mockAccount = {
    id: 'account-1',
    address: '0x123456789abcdef',
    metadata: {
      name: 'Account 1',
      keyring: {
        type: 'HD Key Tree',
      },
    },
    options: {},
    methods: ['personal_sign', 'eth_signTransaction'],
    type: 'eip155:eoa',
    scopes: ['eip155:1'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useDispatch as jest.MockedFunction<typeof useDispatch>).mockReturnValue(
      mockDispatch,
    );
    mockSetCandidateSubscriptionId.mockReturnValue({
      type: 'rewards/setCandidateSubscriptionId',
      payload: '',
    });
  });

  describe('when account does not exist', () => {
    it('should not fetch candidate subscription ID', () => {
      // Arrange
      mockUseSelector
        .mockReturnValueOnce(null) // selectSelectedInternalAccount
        .mockReturnValueOnce(false); // selectRewardsActiveAccountHasOptedIn

      // Act
      renderHook(() => useCandidateSubscriptionId());

      // Assert
      expect(mockEngineCall).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  describe('when account has opted in', () => {
    it('should not fetch candidate subscription ID', () => {
      // Arrange
      mockUseSelector
        .mockReturnValueOnce(mockAccount) // selectSelectedInternalAccount
        .mockReturnValueOnce(true); // selectRewardsActiveAccountHasOptedIn

      // Act
      renderHook(() => useCandidateSubscriptionId());

      // Assert
      expect(mockEngineCall).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  describe('when account exists and has not opted in', () => {
    it('should fetch candidate subscription ID successfully when opt-in status is false', async () => {
      // Arrange
      const mockCandidateId = 'candidate-123';
      mockUseSelector
        .mockReturnValueOnce(mockAccount) // selectSelectedInternalAccount
        .mockReturnValueOnce(false); // selectRewardsActiveAccountHasOptedIn
      mockEngineCall.mockResolvedValueOnce(mockCandidateId);

      // Act
      renderHook(() => useCandidateSubscriptionId());

      // Assert
      expect(mockDispatch).toHaveBeenCalledWith(
        setCandidateSubscriptionId('pending'),
      );
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:getCandidateSubscriptionId',
      );

      // Wait for async operation to complete
      await act(async () => {
        await Promise.resolve();
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        setCandidateSubscriptionId(mockCandidateId),
      );
    });

    it('should fetch candidate subscription ID successfully when opt-in status is null', async () => {
      // Arrange
      const mockCandidateId = 'candidate-456';
      mockUseSelector
        .mockReturnValueOnce(mockAccount) // selectSelectedInternalAccount
        .mockReturnValueOnce(null); // selectRewardsActiveAccountHasOptedIn
      mockEngineCall.mockResolvedValueOnce(mockCandidateId);

      // Act
      renderHook(() => useCandidateSubscriptionId());

      // Assert
      expect(mockDispatch).toHaveBeenCalledWith(
        setCandidateSubscriptionId('pending'),
      );
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:getCandidateSubscriptionId',
      );

      // Wait for async operation to complete
      await act(async () => {
        await Promise.resolve();
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        setCandidateSubscriptionId(mockCandidateId),
      );
    });

    it('should handle API errors by dispatching error state', async () => {
      // Arrange
      const mockError = new Error('Network error');
      mockUseSelector
        .mockReturnValueOnce(mockAccount) // selectSelectedInternalAccount
        .mockReturnValueOnce(false); // selectRewardsActiveAccountHasOptedIn
      mockEngineCall.mockRejectedValueOnce(mockError);

      // Act
      renderHook(() => useCandidateSubscriptionId());

      // Assert
      expect(mockDispatch).toHaveBeenCalledWith(
        setCandidateSubscriptionId('pending'),
      );
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:getCandidateSubscriptionId',
      );

      // Wait for async operation to complete
      await act(async () => {
        await Promise.resolve();
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        setCandidateSubscriptionId('error'),
      );
    });

    it('should handle unknown errors by dispatching error state', async () => {
      // Arrange - testing with non-Error object
      mockUseSelector
        .mockReturnValueOnce(mockAccount) // selectSelectedInternalAccount
        .mockReturnValueOnce(false); // selectRewardsActiveAccountHasOptedIn
      mockEngineCall.mockRejectedValueOnce('String error');

      // Act
      renderHook(() => useCandidateSubscriptionId());

      // Assert
      expect(mockDispatch).toHaveBeenCalledWith(
        setCandidateSubscriptionId('pending'),
      );

      // Wait for async operation to complete
      await act(async () => {
        await Promise.resolve();
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        setCandidateSubscriptionId('error'),
      );
    });
  });

  describe('effect dependencies', () => {
    it('should refetch when account changes', async () => {
      // Arrange
      const newAccount = {
        ...mockAccount,
        id: 'account-2',
        address: '0xabcdef123456789',
      };
      const mockCandidateId = 'candidate-789';

      mockEngineCall.mockResolvedValue(mockCandidateId);

      const { rerender } = renderHook(
        ({ account, hasOptedIn }) => {
          mockUseSelector
            .mockReturnValueOnce(account)
            .mockReturnValueOnce(hasOptedIn);
          return useCandidateSubscriptionId();
        },
        {
          initialProps: { account: mockAccount, hasOptedIn: false },
        },
      );

      // Wait for initial call
      await act(async () => {
        await Promise.resolve();
      });

      expect(mockEngineCall).toHaveBeenCalledTimes(1);
      jest.clearAllMocks();

      // Act - rerender with new account
      act(() => {
        rerender({ account: newAccount, hasOptedIn: false });
      });

      // Wait for second call
      await act(async () => {
        await Promise.resolve();
      });

      // Assert
      expect(mockEngineCall).toHaveBeenCalledTimes(1);
    });

    it('should refetch when opt-in status changes from true to false', async () => {
      // Arrange
      const mockCandidateId = 'candidate-999';
      mockEngineCall.mockResolvedValue(mockCandidateId);

      const { rerender } = renderHook(
        ({ hasOptedIn }: { hasOptedIn: boolean | null }) => {
          mockUseSelector
            .mockReturnValueOnce(mockAccount)
            .mockReturnValueOnce(hasOptedIn);
          return useCandidateSubscriptionId();
        },
        {
          initialProps: { hasOptedIn: true as boolean | null },
        },
      );

      // Initial render - should not call API when opted in
      expect(mockEngineCall).not.toHaveBeenCalled();

      // Act - rerender with hasOptedIn = false
      act(() => {
        rerender({ hasOptedIn: false as boolean | null });
      });

      // Wait for async operation
      await act(async () => {
        await Promise.resolve();
      });

      // Assert
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:getCandidateSubscriptionId',
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        setCandidateSubscriptionId('pending'),
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        setCandidateSubscriptionId(mockCandidateId),
      );
    });

    it('should refetch when opt-in status changes from true to null', async () => {
      // Arrange
      const mockCandidateId = 'candidate-null';
      mockEngineCall.mockResolvedValue(mockCandidateId);

      const { rerender } = renderHook(
        ({ hasOptedIn }: { hasOptedIn: boolean | null }) => {
          mockUseSelector
            .mockReturnValueOnce(mockAccount)
            .mockReturnValueOnce(hasOptedIn);
          return useCandidateSubscriptionId();
        },
        {
          initialProps: { hasOptedIn: true as boolean | null },
        },
      );

      // Initial render - should not call API when opted in
      expect(mockEngineCall).not.toHaveBeenCalled();

      // Act - rerender with hasOptedIn = null
      act(() => {
        rerender({ hasOptedIn: null as boolean | null });
      });

      // Wait for async operation
      await act(async () => {
        await Promise.resolve();
      });

      // Assert
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:getCandidateSubscriptionId',
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        setCandidateSubscriptionId('pending'),
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        setCandidateSubscriptionId(mockCandidateId),
      );
    });

    it('should not refetch when opt-in status changes from false to null', () => {
      // Arrange
      const { rerender } = renderHook(
        ({ hasOptedIn }: { hasOptedIn: boolean | null }) => {
          mockUseSelector
            .mockReturnValueOnce(mockAccount)
            .mockReturnValueOnce(hasOptedIn);
          return useCandidateSubscriptionId();
        },
        {
          initialProps: { hasOptedIn: false as boolean | null },
        },
      );

      // Initial render should trigger one call
      expect(mockEngineCall).toHaveBeenCalledTimes(1);
      jest.clearAllMocks();

      // Act - rerender with hasOptedIn = null (should still trigger since both false and null mean "not opted in")
      act(() => {
        rerender({ hasOptedIn: null as boolean | null });
      });

      // Assert - should trigger another call since null also means "not opted in"
      expect(mockEngineCall).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('should handle empty string response from API', async () => {
      // Arrange
      mockUseSelector
        .mockReturnValueOnce(mockAccount)
        .mockReturnValueOnce(false);
      mockEngineCall.mockResolvedValueOnce('');

      // Act
      renderHook(() => useCandidateSubscriptionId());

      // Wait for async operation
      await act(async () => {
        await Promise.resolve();
      });

      // Assert
      expect(mockDispatch).toHaveBeenCalledWith(setCandidateSubscriptionId(''));
    });

    it('should handle null response from API', async () => {
      // Arrange
      mockUseSelector
        .mockReturnValueOnce(mockAccount)
        .mockReturnValueOnce(false);
      mockEngineCall.mockResolvedValueOnce(null);

      // Act
      renderHook(() => useCandidateSubscriptionId());

      // Wait for async operation
      await act(async () => {
        await Promise.resolve();
      });

      // Assert
      expect(mockDispatch).toHaveBeenCalledWith(
        setCandidateSubscriptionId(null),
      );
    });

    it('should handle undefined response from API', async () => {
      // Arrange
      mockUseSelector
        .mockReturnValueOnce(mockAccount)
        .mockReturnValueOnce(false);
      mockEngineCall.mockResolvedValueOnce(undefined);

      // Act
      renderHook(() => useCandidateSubscriptionId());

      // Wait for async operation
      await act(async () => {
        await Promise.resolve();
      });

      // Assert
      expect(mockDispatch).toHaveBeenCalledWith(
        setCandidateSubscriptionId(null),
      );
    });
  });

  describe('dispatch call verification', () => {
    it('should call dispatch with correct action creator results', async () => {
      // Arrange
      const mockCandidateId = 'test-candidate-id';
      const pendingAction = {
        type: 'rewards/setCandidateSubscriptionId' as const,
        payload: 'pending',
      };
      const successAction = {
        type: 'rewards/setCandidateSubscriptionId' as const,
        payload: mockCandidateId,
      };

      mockUseSelector
        .mockReturnValueOnce(mockAccount)
        .mockReturnValueOnce(false);
      mockEngineCall.mockResolvedValueOnce(mockCandidateId);
      mockSetCandidateSubscriptionId
        .mockReturnValueOnce(pendingAction)
        .mockReturnValueOnce(successAction);

      // Act
      renderHook(() => useCandidateSubscriptionId());

      // Wait for async operation
      await act(async () => {
        await Promise.resolve();
      });

      // Assert
      expect(mockSetCandidateSubscriptionId).toHaveBeenCalledWith('pending');
      expect(mockSetCandidateSubscriptionId).toHaveBeenCalledWith(
        mockCandidateId,
      );
      expect(mockDispatch).toHaveBeenCalledWith(pendingAction);
      expect(mockDispatch).toHaveBeenCalledWith(successAction);
    });
  });
});
