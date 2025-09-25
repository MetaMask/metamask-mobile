import { renderHook } from '@testing-library/react-hooks';
import { useSelector, useDispatch } from 'react-redux';
import { useReferralDetails } from './useReferralDetails';
import Engine from '../../../../core/Engine';
import { setReferralDetailsLoading } from '../../../../reducers/rewards';
import Logger from '../../../../util/Logger';

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

describe('useReferralDetails', () => {
  const mockDispatch = jest.fn();
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockEngineCall = Engine.controllerMessenger.call as jest.MockedFunction<
    typeof Engine.controllerMessenger.call
  >;
  const mockLogger = Logger.log as jest.MockedFunction<typeof Logger.log>;
  const mockUseDispatch = useDispatch as jest.MockedFunction<
    typeof useDispatch
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
  });

  it('should return null', () => {
    mockUseSelector.mockReturnValue(null);
    const { result } = renderHook(() => useReferralDetails());
    expect(result.current).toBeNull();
  });

  it('should not fetch when subscriptionId is not available', () => {
    mockUseSelector.mockReturnValue(null);

    renderHook(() => useReferralDetails());

    expect(mockLogger).toHaveBeenCalledWith(
      'useReferralDetails: No subscription ID available',
    );
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

    expect(mockDispatch).toHaveBeenCalledWith(setReferralDetailsLoading(true));
  });

  it('should handle fetch errors gracefully', async () => {
    const mockSubscriptionId = 'test-subscription-id';
    const mockError = new Error('Network error');

    mockUseSelector.mockReturnValue(mockSubscriptionId);
    mockEngineCall.mockRejectedValueOnce(mockError);

    renderHook(() => useReferralDetails());

    expect(mockDispatch).toHaveBeenCalledWith(setReferralDetailsLoading(true));
  });
});
