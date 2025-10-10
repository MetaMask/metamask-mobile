import { renderHook, act } from '@testing-library/react-hooks';
import { useDispatch, useSelector } from 'react-redux';
import { useCandidateSubscriptionId } from './useCandidateSubscriptionId';
import Engine from '../../../../core/Engine';
import { setCandidateSubscriptionId } from '../../../../actions/rewards';
import { useFocusEffect } from '@react-navigation/native';

// Mock dependencies
jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

jest.mock('../../../../actions/rewards', () => ({
  setCandidateSubscriptionId: jest.fn(),
}));

// Mock React Navigation hooks
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

describe('useCandidateSubscriptionId', () => {
  const mockDispatch = jest.fn();
  const mockUseFocusEffect = useFocusEffect as jest.MockedFunction<
    typeof useFocusEffect
  >;
  const mockUseDispatch = useDispatch as jest.MockedFunction<
    typeof useDispatch
  >;
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockEngineCall = Engine.controllerMessenger.call as jest.MockedFunction<
    typeof Engine.controllerMessenger.call
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    mockUseSelector.mockReturnValue(null); // Default return value for candidateSubscriptionId

    // Reset the mocked hooks
    mockUseFocusEffect.mockClear();
  });

  it('should register focus effect callback', () => {
    renderHook(() => useCandidateSubscriptionId());

    expect(mockUseFocusEffect).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should fetch candidate subscription ID successfully', async () => {
    const mockCandidateId = 'candidate-123';
    mockEngineCall.mockResolvedValueOnce(mockCandidateId);

    renderHook(() => useCandidateSubscriptionId());

    // Verify that the focus effect callback was registered
    expect(mockUseFocusEffect).toHaveBeenCalledWith(expect.any(Function));

    // Execute the focus effect callback to trigger the fetch logic
    const focusCallback = mockUseFocusEffect.mock.calls[0][0];
    focusCallback();

    // Wait for async operations
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsController:getCandidateSubscriptionId',
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setCandidateSubscriptionId(mockCandidateId),
    );
  });

  it('should handle fetch errors gracefully', async () => {
    const mockError = new Error('Fetch failed');
    mockEngineCall.mockRejectedValueOnce(mockError);

    renderHook(() => useCandidateSubscriptionId());

    // Verify that the focus effect callback was registered
    expect(mockUseFocusEffect).toHaveBeenCalledWith(expect.any(Function));

    // Execute the focus effect callback to trigger the fetch logic
    const focusCallback = mockUseFocusEffect.mock.calls[0][0];
    focusCallback();

    // Wait for async operations
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsController:getCandidateSubscriptionId',
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setCandidateSubscriptionId('error'),
    );
  });

  it('should retry fetching when candidateSubscriptionId is set to retry', async () => {
    const mockCandidateId = 'retry-candidate-456';

    // First render with null candidateSubscriptionId
    const { rerender } = renderHook(() => useCandidateSubscriptionId());

    // Simulate candidateSubscriptionId being set to 'retry'
    mockUseSelector.mockReturnValue('retry');
    mockEngineCall.mockResolvedValueOnce(mockCandidateId);

    // Re-render the hook to trigger useEffect
    rerender();

    // Wait for async operations
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsController:getCandidateSubscriptionId',
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setCandidateSubscriptionId(mockCandidateId),
    );
  });

  it('should handle retry errors gracefully', async () => {
    const mockError = new Error('Retry failed');

    // First render with null candidateSubscriptionId
    const { rerender } = renderHook(() => useCandidateSubscriptionId());

    // Simulate candidateSubscriptionId being set to 'retry'
    mockUseSelector.mockReturnValue('retry');
    mockEngineCall.mockRejectedValueOnce(mockError);

    // Re-render the hook to trigger useEffect
    rerender();

    // Wait for async operations
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsController:getCandidateSubscriptionId',
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setCandidateSubscriptionId('error'),
    );
  });

  it('should not fetch when candidateSubscriptionId is not retry', () => {
    // Test with different states that should not trigger fetch
    const nonRetryStates = [null, 'pending', 'error', 'some-id'];

    nonRetryStates.forEach((state) => {
      jest.clearAllMocks();
      mockUseSelector.mockReturnValue(state);

      renderHook(() => useCandidateSubscriptionId());

      // Should only register focus effect, not call engine directly from useEffect
      expect(mockUseFocusEffect).toHaveBeenCalledWith(expect.any(Function));

      // Engine should not be called from useEffect for non-retry states
      expect(mockEngineCall).not.toHaveBeenCalled();
    });
  });
});
