import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector, useDispatch } from 'react-redux';
import { useCommitForDrop } from './useCommitForDrop';
import Engine from '../../../../core/Engine';
import { handleRewardsErrorMessage } from '../utils';
import {
  setRecentDropPointCommit,
  setRecentDropAddressCommit,
} from '../../../../reducers/rewards';
import type { CommitDropPointsResponseDto } from '../../../../core/Engine/controllers/rewards-controller/types';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

jest.mock('../utils', () => ({
  handleRewardsErrorMessage: jest.fn(),
}));

jest.mock('../../../../reducers/rewards', () => ({
  setRecentDropPointCommit: jest.fn(),
  setRecentDropAddressCommit: jest.fn(),
}));

describe('useCommitForDrop', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockUseDispatch = useDispatch as jest.MockedFunction<
    typeof useDispatch
  >;
  const mockDispatch = jest.fn();
  const mockEngineCall = Engine.controllerMessenger.call as jest.MockedFunction<
    typeof Engine.controllerMessenger.call
  >;
  const mockHandleRewardsErrorMessage =
    handleRewardsErrorMessage as jest.MockedFunction<
      typeof handleRewardsErrorMessage
    >;
  const mockSetRecentDropPointCommit =
    setRecentDropPointCommit as jest.MockedFunction<
      typeof setRecentDropPointCommit
    >;
  const mockSetRecentDropAddressCommit =
    setRecentDropAddressCommit as jest.MockedFunction<
      typeof setRecentDropAddressCommit
    >;

  const mockSubscriptionId = 'test-subscription-id';
  const mockDropId = 'test-drop-id';
  const mockPoints = 100;
  const mockAddress = '0x1234567890123456789012345678901234567890';
  const mockResponse: CommitDropPointsResponseDto = {
    commitmentId: 'commitment-1',
    pointsCommitted: 100,
    totalPointsCommitted: 100,
    totalParticipants: 10,
    newRank: 5,
    availablePointsRemaining: 900,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(mockSubscriptionId);
    mockUseDispatch.mockReturnValue(mockDispatch);
    mockHandleRewardsErrorMessage.mockReturnValue('Mocked error message');
  });

  describe('initial state', () => {
    it('should return correct initial values', () => {
      const { result } = renderHook(() => useCommitForDrop());

      expect(result.current.isCommitting).toBe(false);
      expect(result.current.commitError).toBeNull();
      expect(typeof result.current.commitForDrop).toBe('function');
      expect(typeof result.current.clearCommitError).toBe('function');
    });
  });

  describe('commitForDrop function', () => {
    it('should successfully commit points without address', async () => {
      mockEngineCall.mockResolvedValueOnce(mockResponse);
      mockSetRecentDropPointCommit.mockReturnValue({
        type: 'test',
      } as unknown as ReturnType<typeof mockSetRecentDropPointCommit>);

      const { result } = renderHook(() => useCommitForDrop());

      let response: CommitDropPointsResponseDto | null = null;
      await act(async () => {
        response = await result.current.commitForDrop(mockDropId, mockPoints);
      });

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:commitDropPoints',
        mockDropId,
        mockPoints,
        mockSubscriptionId,
        undefined,
      );
      expect(mockSetRecentDropPointCommit).toHaveBeenCalledWith({
        dropId: mockDropId,
        response: mockResponse,
      });
      expect(mockSetRecentDropAddressCommit).not.toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(response).toEqual(mockResponse);
      expect(result.current.isCommitting).toBe(false);
      expect(result.current.commitError).toBeNull();
    });

    it('should successfully commit points with address', async () => {
      mockEngineCall.mockResolvedValueOnce(mockResponse);
      mockSetRecentDropPointCommit.mockReturnValue({
        type: 'test',
      } as unknown as ReturnType<typeof mockSetRecentDropPointCommit>);
      mockSetRecentDropAddressCommit.mockReturnValue({
        type: 'test',
      } as unknown as ReturnType<typeof mockSetRecentDropAddressCommit>);

      const { result } = renderHook(() => useCommitForDrop());

      await act(async () => {
        await result.current.commitForDrop(mockDropId, mockPoints, mockAddress);
      });

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:commitDropPoints',
        mockDropId,
        mockPoints,
        mockSubscriptionId,
        mockAddress,
      );
      expect(mockSetRecentDropPointCommit).toHaveBeenCalledWith({
        dropId: mockDropId,
        response: mockResponse,
      });
      expect(mockSetRecentDropAddressCommit).toHaveBeenCalledWith({
        dropId: mockDropId,
        address: mockAddress,
      });
      expect(mockDispatch).toHaveBeenCalledTimes(2);
    });

    it('should set loading state during commit', async () => {
      let resolvePromise: (value: CommitDropPointsResponseDto) => void;
      const promise = new Promise<CommitDropPointsResponseDto>((resolve) => {
        resolvePromise = resolve;
      });
      mockEngineCall.mockReturnValueOnce(promise);

      const { result } = renderHook(() => useCommitForDrop());

      act(() => {
        result.current.commitForDrop(mockDropId, mockPoints);
      });

      expect(result.current.isCommitting).toBe(true);
      expect(result.current.commitError).toBeNull();

      await act(async () => {
        resolvePromise(mockResponse);
        await promise;
      });

      expect(result.current.isCommitting).toBe(false);
    });

    it('should handle missing subscription ID', async () => {
      mockUseSelector.mockReturnValue(null);
      const { result } = renderHook(() => useCommitForDrop());

      let response: CommitDropPointsResponseDto | null = null;
      await act(async () => {
        response = await result.current.commitForDrop(mockDropId, mockPoints);
      });

      expect(mockEngineCall).not.toHaveBeenCalled();
      expect(response).toBeNull();
      expect(result.current.commitError).toBe(
        'No subscription found. Please try again.',
      );
      expect(result.current.isCommitting).toBe(false);
    });

    it('should handle missing drop ID', async () => {
      const { result } = renderHook(() => useCommitForDrop());

      let response: CommitDropPointsResponseDto | null = null;
      await act(async () => {
        response = await result.current.commitForDrop('', mockPoints);
      });

      expect(mockEngineCall).not.toHaveBeenCalled();
      expect(response).toBeNull();
      expect(result.current.commitError).toBe('Drop ID is required.');
    });

    it('should handle zero points', async () => {
      const { result } = renderHook(() => useCommitForDrop());

      let response: CommitDropPointsResponseDto | null = null;
      await act(async () => {
        response = await result.current.commitForDrop(mockDropId, 0);
      });

      expect(mockEngineCall).not.toHaveBeenCalled();
      expect(response).toBeNull();
      expect(result.current.commitError).toBe('Points must be greater than 0.');
    });

    it('should handle negative points', async () => {
      const { result } = renderHook(() => useCommitForDrop());

      let response: CommitDropPointsResponseDto | null = null;
      await act(async () => {
        response = await result.current.commitForDrop(mockDropId, -10);
      });

      expect(mockEngineCall).not.toHaveBeenCalled();
      expect(response).toBeNull();
      expect(result.current.commitError).toBe('Points must be greater than 0.');
    });

    it('should handle commit error', async () => {
      const mockError = new Error('Commit failed');
      mockEngineCall.mockRejectedValueOnce(mockError);
      mockHandleRewardsErrorMessage.mockReturnValue('Failed to commit');

      const { result } = renderHook(() => useCommitForDrop());

      await act(async () => {
        try {
          await result.current.commitForDrop(mockDropId, mockPoints);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(mockHandleRewardsErrorMessage).toHaveBeenCalledWith(mockError);
      expect(result.current.commitError).toBe('Failed to commit');
      expect(result.current.isCommitting).toBe(false);
    });

    it('should clear error before new commit attempt', async () => {
      const mockError = new Error('First error');
      mockEngineCall.mockRejectedValueOnce(mockError);
      mockHandleRewardsErrorMessage.mockReturnValue('First error message');

      const { result } = renderHook(() => useCommitForDrop());

      await act(async () => {
        try {
          await result.current.commitForDrop(mockDropId, mockPoints);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.commitError).toBe('First error message');

      mockEngineCall.mockResolvedValueOnce(mockResponse);

      await act(async () => {
        await result.current.commitForDrop(mockDropId, mockPoints);
      });

      expect(result.current.commitError).toBeNull();
    });

    it('should re-throw error after handling', async () => {
      const mockError = new Error('Commit failed');
      mockEngineCall.mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useCommitForDrop());

      await act(async () => {
        await expect(
          result.current.commitForDrop(mockDropId, mockPoints),
        ).rejects.toThrow('Commit failed');
      });
    });
  });

  describe('clearCommitError function', () => {
    it('should clear error state', async () => {
      const mockError = new Error('Test error');
      mockEngineCall.mockRejectedValueOnce(mockError);
      mockHandleRewardsErrorMessage.mockReturnValue('Test error message');

      const { result } = renderHook(() => useCommitForDrop());

      await act(async () => {
        try {
          await result.current.commitForDrop(mockDropId, mockPoints);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.commitError).toBe('Test error message');

      act(() => {
        result.current.clearCommitError();
      });

      expect(result.current.commitError).toBeNull();
    });
  });
});
