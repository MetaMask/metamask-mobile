import { renderHook } from '@testing-library/react-hooks';
import { useSelector, useDispatch } from 'react-redux';
import { useReferralDetails } from './useReferralDetails';
import Engine from '../../../../core/Engine';
import { setReferralDetailsLoading } from '../../../../reducers/rewards';
import { useFocusEffect } from '@react-navigation/native';

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

jest.mock('../../../../reducers/rewards', () => ({
  setReferralDetails: jest.fn(),
  setReferralDetailsLoading: jest.fn(),
}));

jest.mock('../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
}));

jest.mock('../../../../util/Logger', () => ({
  log: jest.fn(),
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

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);

    // Reset the mocked hook
    mockUseFocusEffect.mockClear();
  });

  it('should not fetch when subscriptionId is not available', () => {
    mockUseSelector.mockReturnValue(null);

    renderHook(() => useReferralDetails());

    expect(mockEngineCall).not.toHaveBeenCalled();
  });

  it('should fetch referral details successfully', async () => {
    const mockSubscriptionId = 'test-subscription-id';
    const mockReferralDetails = {
      referralCode: 'ABC123',
      totalReferees: 5,
    };

    mockUseSelector.mockReturnValue(mockSubscriptionId);
    mockEngineCall.mockResolvedValueOnce(mockReferralDetails);

    renderHook(() => useReferralDetails());

    // Get the focus effect callback and trigger it
    const focusCallback = mockUseFocusEffect.mock.calls[0][0];
    await focusCallback();

    expect(mockDispatch).toHaveBeenCalledWith(setReferralDetailsLoading(true));
  });

  it('should register focus effect callback', () => {
    mockUseSelector.mockReturnValue('test-subscription-id');

    renderHook(() => useReferralDetails());

    expect(mockUseFocusEffect).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should prevent duplicate fetch calls when already loading', async () => {
    const mockSubscriptionId = 'test-subscription-id';
    mockUseSelector.mockReturnValue(mockSubscriptionId);

    // First call will start loading
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

  it('should fetch data when focus effect callback is triggered', async () => {
    const mockSubscriptionId = 'test-subscription-id';
    const mockReferralDetails = {
      referralCode: 'ABC123',
      totalReferees: 5,
    };

    mockUseSelector.mockReturnValue(mockSubscriptionId);
    mockEngineCall.mockResolvedValueOnce(mockReferralDetails);

    renderHook(() => useReferralDetails());

    // Get the focus effect callback and trigger it
    const focusCallback = mockUseFocusEffect.mock.calls[0][0];
    expect(focusCallback).toBeDefined();

    await focusCallback();

    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsController:getReferralDetails',
      mockSubscriptionId,
    );
  });
});
