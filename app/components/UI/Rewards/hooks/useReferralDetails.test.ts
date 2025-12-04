import { renderHook } from '@testing-library/react-hooks';
import { useSelector, useDispatch } from 'react-redux';
import { useReferralDetails } from './useReferralDetails';
import Engine from '../../../../core/Engine';
import {
  setReferralDetails,
  setReferralDetailsLoading,
  setReferralDetailsError,
} from '../../../../reducers/rewards';
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

jest.mock('../../../../reducers/rewards', () => ({
  setReferralDetails: jest.fn(),
  setReferralDetailsLoading: jest.fn(),
  setReferralDetailsError: jest.fn(),
}));

jest.mock('../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
}));

// Mock the useInvalidateByRewardEvents hook
jest.mock('./useInvalidateByRewardEvents', () => ({
  useInvalidateByRewardEvents: jest.fn(),
}));

// Mock React Navigation hooks
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

describe('useReferralDetails', () => {
  const mockDispatch = jest.fn();
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockEngineCall = Engine.controllerMessenger.call as jest.MockedFunction<
    typeof Engine.controllerMessenger.call
  >;
  const mockUseDispatch = useDispatch as jest.MockedFunction<
    typeof useDispatch
  >;
  const mockUseFocusEffect = useFocusEffect as jest.MockedFunction<
    typeof useFocusEffect
  >;

  const mockReferralDetails = {
    referralCode: 'ABC123',
    totalReferees: 5,
    referralPoints: 100,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    mockUseSelector.mockClear();
    mockUseFocusEffect.mockClear();
  });

  it('returns a fetch function', () => {
    mockUseSelector
      .mockReturnValueOnce('test-subscription-id')
      .mockReturnValueOnce('test-season-id');

    const { result } = renderHook(() => useReferralDetails());

    expect(result.current).toEqual({
      fetchReferralDetails: expect.any(Function),
    });
    expect(typeof result.current.fetchReferralDetails).toBe('function');
  });

  it('skips fetch when subscriptionId is missing', () => {
    mockUseSelector.mockClear();
    mockUseSelector
      .mockReturnValueOnce(null)
      .mockReturnValueOnce('test-season-id');

    renderHook(() => useReferralDetails());

    // Execute the focus effect callback to trigger the fetch logic
    const focusCallback = mockUseFocusEffect.mock.calls[0][0];
    focusCallback();

    expect(mockDispatch).toHaveBeenCalledWith(setReferralDetailsError(false));
    expect(mockDispatch).toHaveBeenCalledWith(setReferralDetailsLoading(false));
    expect(mockEngineCall).not.toHaveBeenCalled();
  });

  it('skips fetch when seasonId is missing', () => {
    mockUseSelector.mockClear();
    mockUseSelector
      .mockReturnValueOnce('test-subscription-id')
      .mockReturnValueOnce(null);

    renderHook(() => useReferralDetails());

    // Execute the focus effect callback to trigger the fetch logic
    const focusCallback = mockUseFocusEffect.mock.calls[0][0];
    focusCallback();

    expect(mockDispatch).toHaveBeenCalledWith(setReferralDetailsError(false));
    expect(mockDispatch).toHaveBeenCalledWith(setReferralDetailsLoading(false));
    expect(mockEngineCall).not.toHaveBeenCalled();
  });

  it('fetches referral details successfully', async () => {
    mockUseSelector
      .mockReturnValueOnce('test-subscription-id')
      .mockReturnValueOnce('test-season-id');
    mockEngineCall.mockResolvedValue(mockReferralDetails);

    renderHook(() => useReferralDetails());

    // Execute the focus effect callback to trigger the fetch logic
    const focusCallback = mockUseFocusEffect.mock.calls[0][0];
    await focusCallback();

    expect(mockDispatch).toHaveBeenCalledWith(setReferralDetailsLoading(true));
    expect(mockDispatch).toHaveBeenCalledWith(setReferralDetailsError(false));
    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsController:getReferralDetails',
      'test-subscription-id',
      'test-season-id',
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setReferralDetails({
        referralCode: mockReferralDetails.referralCode,
        refereeCount: mockReferralDetails.totalReferees,
        referralPoints: mockReferralDetails.referralPoints,
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(setReferralDetailsLoading(false));
  });

  it('handles fetch error and dispatch error state', async () => {
    mockUseSelector
      .mockReturnValueOnce('test-subscription-id')
      .mockReturnValueOnce('test-season-id');
    const mockError = new Error('Network error');
    mockEngineCall.mockRejectedValue(mockError);

    renderHook(() => useReferralDetails());

    // Execute the focus effect callback to trigger the fetch logic
    const focusCallback = mockUseFocusEffect.mock.calls[0][0];
    await focusCallback();

    expect(mockDispatch).toHaveBeenCalledWith(setReferralDetailsLoading(true));
    expect(mockDispatch).toHaveBeenCalledWith(setReferralDetailsError(false));
    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsController:getReferralDetails',
      'test-subscription-id',
      'test-season-id',
    );
    expect(mockDispatch).toHaveBeenCalledWith(setReferralDetailsError(true));
    expect(mockDispatch).toHaveBeenCalledWith(setReferralDetailsLoading(false));
  });

  it('registers focus effect callback', () => {
    mockUseSelector
      .mockReturnValueOnce('test-subscription-id')
      .mockReturnValueOnce('test-season-id');

    renderHook(() => useReferralDetails());

    expect(mockUseFocusEffect).toHaveBeenCalledWith(expect.any(Function));
  });

  it('prevents duplicate fetch calls when already loading', async () => {
    mockUseSelector
      .mockReturnValueOnce('test-subscription-id')
      .mockReturnValueOnce('test-season-id');
    // First call will start loading and never resolve
    mockEngineCall.mockImplementation(
      () =>
        new Promise(() => {
          // Never resolves
        }),
    );

    renderHook(() => useReferralDetails());

    // Trigger focus effect callback multiple times
    const focusCallback = mockUseFocusEffect.mock.calls[0][0];
    focusCallback();
    focusCallback();

    // Should only be called once despite multiple focus triggers
    expect(mockEngineCall).toHaveBeenCalledTimes(1);
  });

  it('sets loading to true at start and false after completion', async () => {
    mockUseSelector
      .mockReturnValueOnce('test-subscription-id')
      .mockReturnValueOnce('test-season-id');
    mockEngineCall.mockResolvedValue(mockReferralDetails);

    renderHook(() => useReferralDetails());

    // Execute the focus effect callback to trigger the fetch logic
    const focusCallback = mockUseFocusEffect.mock.calls[0][0];
    await focusCallback();

    // Verify loading states are managed correctly
    expect(mockDispatch).toHaveBeenCalledWith(setReferralDetailsLoading(true));
    expect(mockDispatch).toHaveBeenCalledWith(setReferralDetailsLoading(false));
  });

  it('sets loading to false even when error occurs', async () => {
    mockUseSelector
      .mockReturnValueOnce('test-subscription-id')
      .mockReturnValueOnce('test-season-id');
    const mockError = new Error('Network error');
    mockEngineCall.mockRejectedValue(mockError);

    renderHook(() => useReferralDetails());

    // Execute the focus effect callback to trigger the fetch logic
    const focusCallback = mockUseFocusEffect.mock.calls[0][0];
    await focusCallback();

    // Verify loading is set to false after error
    expect(mockDispatch).toHaveBeenCalledWith(setReferralDetailsLoading(false));
  });

  it('should handle null response from controller', async () => {
    mockUseSelector
      .mockReturnValueOnce('test-subscription-id')
      .mockReturnValueOnce('test-season-id');
    mockEngineCall.mockResolvedValue(null);

    renderHook(() => useReferralDetails());

    // Execute the focus effect callback to trigger the fetch logic
    const focusCallback = mockUseFocusEffect.mock.calls[0][0];
    await focusCallback();

    expect(mockDispatch).toHaveBeenCalledWith(setReferralDetailsLoading(true));
    expect(mockDispatch).toHaveBeenCalledWith(
      setReferralDetails({
        referralCode: undefined,
        refereeCount: undefined,
        referralPoints: undefined,
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(setReferralDetailsLoading(false));
  });
});
