import { renderHook } from '@testing-library/react-hooks';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import Engine from '../../../../core/Engine';
import { useBenefits } from './useBenefits';
import {
  setBenefits,
  setBenefitsError,
  setBenefitsLoading,
} from '../../../../reducers/rewards';

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

jest.mock('../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
}));

jest.mock('../../../../reducers/rewards', () => ({
  setBenefits: jest.fn((payload) => ({ type: 'setBenefits', payload })),
  setBenefitsError: jest.fn((payload) => ({
    type: 'setBenefitsError',
    payload,
  })),
  setBenefitsLoading: jest.fn((payload) => ({
    type: 'setBenefitsLoading',
    payload,
  })),
}));

jest.mock('./useInvalidateByRewardEvents', () => ({
  useInvalidateByRewardEvents: jest.fn(),
}));

describe('useBenefits', () => {
  const mockDispatch = jest.fn();
  const mockUseDispatch = useDispatch as jest.MockedFunction<
    typeof useDispatch
  >;
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockUseFocusEffect = useFocusEffect as jest.MockedFunction<
    typeof useFocusEffect
  >;
  const mockEngineCall = Engine.controllerMessenger.call as jest.MockedFunction<
    typeof Engine.controllerMessenger.call
  >;
  const mockSetBenefits = setBenefits as jest.MockedFunction<
    typeof setBenefits
  >;
  const mockSetBenefitsError = setBenefitsError as jest.MockedFunction<
    typeof setBenefitsError
  >;
  const mockSetBenefitsLoading = setBenefitsLoading as jest.MockedFunction<
    typeof setBenefitsLoading
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    mockUseSelector.mockReturnValue('test-subscription-id');
  });

  it('clears benefits when subscriptionId is missing', async () => {
    mockUseSelector.mockReturnValue(null);

    renderHook(() => useBenefits());

    const focusCallback = mockUseFocusEffect.mock.calls[0][0];
    await focusCallback();

    expect(mockSetBenefits).toHaveBeenCalledWith({
      benefits: [],
      limit: 200,
      lastFetched: expect.any(Number),
    });
    expect(mockSetBenefitsError).toHaveBeenCalledWith(false);
    expect(mockSetBenefitsLoading).toHaveBeenCalledWith(false);
    expect(mockEngineCall).not.toHaveBeenCalled();
  });

  it('fetches and stores benefits when subscriptionId exists', async () => {
    const benefitsState = {
      benefits: [
        {
          id: 1,
          longTitle: 'Benefit 1',
        },
      ],
      limit: 200,
      lastFetched: 123,
    };
    mockEngineCall.mockResolvedValue(benefitsState);

    renderHook(() => useBenefits());

    const focusCallback = mockUseFocusEffect.mock.calls[0][0];
    await focusCallback();

    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsController:getBenefits',
      'test-subscription-id',
      200,
    );
    expect(mockSetBenefits).toHaveBeenCalledWith(benefitsState);
    expect(mockSetBenefitsLoading).toHaveBeenCalledWith(true);
    expect(mockSetBenefitsLoading).toHaveBeenCalledWith(false);
  });
});
